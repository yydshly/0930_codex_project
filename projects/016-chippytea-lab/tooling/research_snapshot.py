"""Build a read-only snapshot for static previews; never collect a receipt."""

import json
import sys

from research_server import ROOT, ResearchError, ResearchStore


def main():
    try:
        state = ResearchStore().state()
        state["mode"] = "snapshot"
        state["snapshotNotice"] = "静态预览只显示生成时的结构核验快照；无法重新核验或真实入册，请打开本机 8977 服务。"
        target = ROOT / "projects/016-chippytea-lab/web/research-state.json"
        target.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Read-only snapshot: {target}")
        return 0
    except (ResearchError, OSError) as error:
        print(f"Snapshot failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
