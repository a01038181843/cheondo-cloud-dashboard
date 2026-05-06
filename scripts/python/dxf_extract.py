# -*- coding: utf-8 -*-
"""
dxf_extract.py — 천도글라스 창호일람표 DXF 자동 추출기

CAD 도면(DXF)에서 창호 부호, 치수, 유리 종류, 수량을 자동 추출하여
유리물량자동산출.html이 인식하는 JSON 구조로 저장합니다.

사용법:
    python dxf_extract.py <파일.dxf> [출력.json]

요구사항:
    pip install ezdxf

[클라우드 참고] Vercel 환경에서는 Python을 실행할 수 없습니다.
이 스크립트는 로컬 Windows 환경에서 직접 실행하거나,
별도 Python 마이크로서비스(FastAPI 등)로 래핑 후 API로 호출하세요.
Vercel에서는 /api/dxf-extract/route.ts 가 이 서비스를 호출합니다.
"""

import sys
import json
import re
import math
from pathlib import Path
from collections import defaultdict

try:
    import ezdxf
except ImportError:
    print("[오류] ezdxf 모듈이 필요합니다.")
    print("      pip install ezdxf 로 설치하세요.")
    sys.exit(1)


# 창호 부호 패턴 (AW1, ACW3, ASD2, SCW5 등)
CODE_PREFIXES = ("AW", "ACW", "ASD", "SCW", "AFW", "AFD")
CODE_PATTERN = re.compile(r"^(AW|ACW|ASD|SCW|AFW|AFD)$", re.IGNORECASE)
NUMBER_PATTERN = re.compile(r"^\d{1,3}$")
FULLCODE_PATTERN = re.compile(r"^(AW|ACW|ASD|SCW|AFW|AFD)\d{1,3}$", re.IGNORECASE)

# 유리 종류 인식 키워드
GLASS_KEYWORDS = {
    "로이": "로이유리",
    "로-이": "로이유리",
    "LOW-E": "로이유리",
    "LOW E": "로이유리",
    "LOWE": "로이유리",
    "복층": "복층유리",
    "강화": "강화유리",
    "접합": "접합유리",
    "투명": "투명유리",
    "망입": "망입유리",
    "알곤": "알곤가스",
}

# 두께 패턴 (24T, 8T, 10mm, 22㎜ 등)
THICKNESS_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*(?:T|mm|㎜)", re.IGNORECASE)

# 개수 표기 (×12개, x 6EA 등)
COUNT_PATTERN = re.compile(r"[x×X]\s*(\d+)\s*(?:EA|개|SET)?", re.IGNORECASE)

# 근접 매칭 임계값(mm) — 부호 prefix+number 재조립용
PROXIMITY_THRESHOLD = 3000

# 창호 박스 클러스터링 거리(mm)
CLUSTER_DISTANCE = 8000


def distance(p1, p2):
    """두 점 사이 유클리드 거리"""
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])


def get_text_content(entity):
    """TEXT/MTEXT 엔티티에서 내용 추출 (제어문자 제거)"""
    try:
        if entity.dxftype() == "MTEXT":
            raw = entity.plain_text() if hasattr(entity, "plain_text") else entity.text
        else:
            raw = entity.dxf.text
        return str(raw).strip()
    except Exception:
        return ""


def get_text_position(entity):
    """TEXT/MTEXT 기준점 반환 (x, y)"""
    try:
        ins = entity.dxf.insert
        return (float(ins[0]), float(ins[1]))
    except Exception:
        try:
            ins = entity.dxf.align_point
            return (float(ins[0]), float(ins[1]))
        except Exception:
            return (0.0, 0.0)


def reconstruct_codes(texts):
    """
    분리된 prefix TEXT와 number TEXT를 근접도로 매칭하여
    완전한 창호 부호(AW1, ACW3 등)로 재조립.
    이미 합쳐진 TEXT(예: "AW1")는 그대로 사용.
    """
    prefixes = []
    numbers = []
    fullcodes = []

    for t in texts:
        content = t["text"].strip().upper()
        if FULLCODE_PATTERN.match(content):
            fullcodes.append((content, t["pos"]))
        elif CODE_PATTERN.match(content):
            prefixes.append((content, t["pos"]))
        elif NUMBER_PATTERN.match(content):
            numbers.append((content, t["pos"]))

    reconstructed = list(fullcodes)

    # prefix + 근접 number 매칭
    used_numbers = set()
    for pre_text, pre_pos in prefixes:
        best_idx = -1
        best_dist = PROXIMITY_THRESHOLD
        for i, (num_text, num_pos) in enumerate(numbers):
            if i in used_numbers:
                continue
            d = distance(pre_pos, num_pos)
            if d < best_dist:
                best_dist = d
                best_idx = i
        if best_idx >= 0:
            num_text, num_pos = numbers[best_idx]
            code = pre_text + num_text
            mid_pos = ((pre_pos[0] + num_pos[0]) / 2, (pre_pos[1] + num_pos[1]) / 2)
            reconstructed.append((code, mid_pos))
            used_numbers.add(best_idx)

    # 중복 제거
    seen = set()
    unique = []
    for code, pos in reconstructed:
        key = (code, round(pos[0]), round(pos[1]))
        if key not in seen:
            seen.add(key)
            unique.append({"code": code, "pos": pos})

    return unique


def find_nearby_texts(center_pos, texts, radius):
    """중심점 반경 내 TEXT 목록 반환"""
    result = []
    for t in texts:
        if distance(center_pos, t["pos"]) <= radius:
            result.append(t)
    return result


def classify_glass_type(text_list):
    """주변 TEXT에서 유리 종류와 두께 추출"""
    combined = " ".join(t["text"] for t in text_list).upper()
    thickness = None
    m = THICKNESS_PATTERN.search(combined)
    if m:
        thickness = m.group(1).replace(".0", "")

    detected = []
    for kw, label in GLASS_KEYWORDS.items():
        if kw.upper() in combined:
            if label not in detected:
                detected.append(label)

    if thickness and detected:
        return f"{thickness}T {' '.join(detected)}"
    if thickness:
        return f"{thickness}T 강화유리"
    if detected:
        return " ".join(detected)
    return ""


def extract_count(text_list):
    """주변 TEXT에서 설치 개수 추출 (없으면 1)"""
    for t in text_list:
        m = COUNT_PATTERN.search(t["text"])
        if m:
            try:
                return int(m.group(1))
            except ValueError:
                continue
    return 1


def assign_dimensions_to_codes(codes, dimensions, cluster_radius):
    """각 부호 주변 cluster_radius 내 DIMENSION을 모아 가로(H)/세로(V)로 분류."""
    result = {}
    for c in codes:
        code = c["code"]
        pos = c["pos"]
        widths = []
        heights = []
        for d in dimensions:
            if distance(pos, d["pos"]) <= cluster_radius:
                val = int(round(d["value"]))
                if val <= 0:
                    continue
                if d["direction"] == "H":
                    widths.append(val)
                elif d["direction"] == "V":
                    heights.append(val)

        widths = sorted(set(widths))
        heights = sorted(set(heights), reverse=True)

        if code in result:
            result[code]["widths"].extend(widths)
            result[code]["heights"].extend(heights)
            result[code]["positions"].append(pos)
        else:
            result[code] = {
                "widths": widths,
                "heights": heights,
                "positions": [pos],
            }

    for code, info in result.items():
        info["widths"] = sorted(set(info["widths"]))
        info["heights"] = sorted(set(info["heights"]), reverse=True)
    return result


def extract_dxf(dxf_path):
    """DXF 파일 전체 분석 → 중간 데이터 구조 반환"""
    print(f"[진행] DXF 파일 읽는 중: {dxf_path}")
    try:
        doc = ezdxf.readfile(str(dxf_path))
    except IOError:
        raise RuntimeError(f"파일을 열 수 없습니다: {dxf_path}")
    except ezdxf.DXFStructureError as e:
        raise RuntimeError(f"DXF 파일 구조 오류: {e}")

    msp = doc.modelspace()

    texts = []
    for entity in msp.query("TEXT MTEXT"):
        content = get_text_content(entity)
        if not content:
            continue
        pos = get_text_position(entity)
        texts.append({"text": content, "pos": pos, "layer": entity.dxf.layer})
    print(f"[진행] TEXT 엔티티 {len(texts)}개 수집")

    dimensions = []
    for dim in msp.query("DIMENSION"):
        try:
            value = dim.get_measurement()
            if value is None:
                continue
        except Exception:
            continue
        try:
            text_mid = dim.dxf.text_midpoint
            pos = (float(text_mid[0]), float(text_mid[1]))
        except Exception:
            try:
                defp = dim.dxf.defpoint
                pos = (float(defp[0]), float(defp[1]))
            except Exception:
                continue

        angle = 0.0
        try:
            angle = float(getattr(dim.dxf, "angle", 0.0))
        except Exception:
            angle = 0.0

        ang_norm = angle % 180
        direction = "H" if (ang_norm < 45 or ang_norm > 135) else "V"

        dimensions.append({
            "value": float(value),
            "pos": pos,
            "direction": direction,
            "layer": dim.dxf.layer,
        })
    print(f"[진행] DIMENSION 엔티티 {len(dimensions)}개 수집")

    codes = reconstruct_codes(texts)
    print(f"[진행] 창호 부호 {len(codes)}개 인식")

    code_data = assign_dimensions_to_codes(codes, dimensions, CLUSTER_DISTANCE)

    return {"texts": texts, "dimensions": dimensions, "codes": codes, "code_data": code_data}


def build_windows_json(extracted, all_texts):
    """유리물량자동산출.html이 인식하는 JSON 구조 생성"""
    windows = []
    code_data = extracted["code_data"]

    for code in sorted(code_data.keys()):
        info = code_data[code]
        rep_pos = info["positions"][0]
        nearby = find_nearby_texts(rep_pos, all_texts, CLUSTER_DISTANCE)
        glass_type = classify_glass_type(nearby)
        window_count = extract_count(nearby)
        widths = info["widths"]
        heights = info["heights"]
        warning = "치수 인식 실패 — 수동 확인 필요" if not widths or not heights else None

        windows.append({
            "code": code,
            "glass_type": glass_type or "유리종류 미인식",
            "widths": widths,
            "heights": heights,
            "window_count": max(1, window_count),
            "location": "",
            "pane_overrides": [],
            "direct_panes": [],
            "warning": warning,
        })

    return {"windows": windows}


def print_summary(result):
    """추출 결과 요약 출력"""
    windows = result["windows"]
    print("\n" + "=" * 60)
    print(f"[추출 완료] 창호 부호 {len(windows)}개")
    print("=" * 60)
    for w in windows:
        w_count = len(w["widths"])
        h_count = len(w["heights"])
        total = w_count * h_count * w["window_count"]
        mark = " [경고]" if w.get("warning") else ""
        print(f"  {w['code']:6s} | 가로 {w_count}구간 x 세로 {h_count}구간 "
              f"x {w['window_count']}개 = {total}장 | {w['glass_type']}{mark}")
    print("=" * 60)


def main():
    if len(sys.argv) < 2:
        print("사용법: python dxf_extract.py <파일.dxf> [출력.json]")
        sys.exit(1)

    dxf_path = Path(sys.argv[1])
    if not dxf_path.exists():
        print(f"[오류] 파일이 존재하지 않습니다: {dxf_path}")
        sys.exit(1)

    out_path = Path(sys.argv[2]) if len(sys.argv) >= 3 else dxf_path.with_name(dxf_path.stem + "_추출결과.json")

    try:
        extracted = extract_dxf(dxf_path)
        result = build_windows_json(extracted, extracted["texts"])
    except RuntimeError as e:
        print(f"[오류] {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[오류] 추출 중 예외 발생: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    try:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
    except IOError as e:
        print(f"[오류] JSON 저장 실패: {e}")
        sys.exit(1)

    print_summary(result)
    print(f"\n[저장 완료] {out_path}")


if __name__ == "__main__":
    main()
