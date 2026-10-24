"""
Check the GridRoom power-flow engine against pandapower.

Same 25-house street, same wire impedances, loads and solar, three cases
(smart inverters off, since pandapower has no volt/VAR loop built in):

  1. sunny spring noon, every house has solar   -> voltage rises
  2. heat wave afternoon, no solar              -> voltage sags
  3. evening with 8 EVs charging                -> voltage sags

Usage (from the repo root):
    pip install -r validation/requirements.txt
    python validation/validate.py            # uses validation/engine_cases.json
    python validation/validate.py --refresh  # re-runs our engine first (needs Node)

Writes validation/validation_chart.png and copies it to public/.
"""

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import pandapower as pp  # noqa: E402

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CASES_FILE = HERE / "engine_cases.json"
CHART_FILE = HERE / "validation_chart.png"
PUBLIC_CHART = ROOT / "public" / "validation_chart.png"

GOAL_PU = 0.002

# Same per-house reactive load as realEngine.ts
LOAD_KVAR = {"spring": 0.25, "heatwave": 1.4, "evening": 0.6}

# Our engine is per-unit on 100 kVA. pandapower wants ohms, so pick a voltage base.
# Any base gives the same per-unit answer; 0.4 kV is a normal LV choice.
V_KV, S_MVA = 0.4, 0.1
Z_BASE = V_KV**2 / S_MVA                  # 1.6 ohm
OHM_PER_KM = 0.004 / 0.040 * Z_BASE       # 0.004 pu per 40 m -> 0.16 ohm/km (r and x)

TITLES = {
    "spring_all_solar": "Sunny noon, all solar",
    "heatwave_no_solar": "Heat wave, no solar",
    "evening_with_evs": "Evening, 8 EVs charging",
}


def refresh_engine_cases():
    npm = "npm.cmd" if sys.platform == "win32" else "npm"
    subprocess.run([npm, "run", "export-validation"], cwd=ROOT, check=True)


def pandapower_voltages(case):
    inp = case["input"]
    net = pp.create_empty_network(sn_mva=S_MVA)
    source = pp.create_bus(net, vn_kv=V_KV)
    pp.create_ext_grid(net, source, vm_pu=1.02)

    prev, houses = source, []
    for i in range(inp["numHomes"]):
        bus = pp.create_bus(net, vn_kv=V_KV)
        pp.create_line_from_parameters(
            net, prev, bus,
            length_km=inp["segmentLengthM"] / 1000,
            r_ohm_per_km=OHM_PER_KM, x_ohm_per_km=OHM_PER_KM,
            c_nf_per_km=0, max_i_ka=1,
        )
        pp.create_load(net, bus, p_mw=case["loadKw"][i] / 1000,
                       q_mvar=LOAD_KVAR[inp["scenario"]] / 1000)
        if case["solarKw"][i] > 0:
            pp.create_sgen(net, bus, p_mw=case["solarKw"][i] / 1000, q_mvar=0)
        houses.append(bus)
        prev = bus

    pp.runpp(net, tolerance_mva=1e-10, numba=False)
    return [float(net.res_bus.vm_pu.at[b]) for b in houses]


def make_chart(results):
    ours_color, pp_color = "#2a78d6", "#eb6834"
    plt.rcParams.update({"font.size": 11, "axes.spines.top": False, "axes.spines.right": False})
    fig, axes = plt.subplots(1, 3, figsize=(13, 4.2), sharey=True)

    for ax, (name, (v_ours, v_pp, diff)) in zip(axes, results.items()):
        x = range(len(v_ours))
        ax.axhspan(0.95, 1.05, color="#2fa84f", alpha=0.08, lw=0)
        for lim in (0.95, 1.05):
            ax.axhline(lim, color="#9a9a92", lw=1, ls="--")
        ax.plot(x, v_ours, color=ours_color, lw=2, label="GridRoom engine")
        ax.plot(x, v_pp, "o", ms=8, mfc="none", mec=pp_color, mew=2, label="pandapower")
        ax.set_title(f"{TITLES[name]}\nmax difference {diff:.1e} pu", fontsize=11)
        ax.set_xlabel("House number (0 = next to transformer)")
        ax.grid(axis="y", color="#e6e6e1", lw=0.8)
        ax.set_ylim(0.90, 1.10)

    axes[0].set_ylabel("Voltage (per-unit)")
    handles, labels = axes[0].get_legend_handles_labels()
    fig.legend(handles, labels, loc="upper right", ncol=2, frameon=False, bbox_to_anchor=(0.99, 1.0))
    axes[1].text(24, 1.053, "safe range 0.95–1.05", ha="right", va="bottom", color="#5f5f58", fontsize=9)
    fig.suptitle("Our power-flow engine matches pandapower on the same 25-house street",
                 fontsize=13, x=0.01, ha="left")
    fig.tight_layout()
    fig.savefig(CHART_FILE, dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--refresh", action="store_true", help="re-run our engine to rebuild engine_cases.json")
    args = parser.parse_args()

    if args.refresh or not CASES_FILE.exists():
        refresh_engine_cases()
    ours = json.loads(CASES_FILE.read_text())

    results = {}
    for name, case in ours.items():
        v_pp = pandapower_voltages(case)
        diff = max(abs(a - b) for a, b in zip(case["voltages"], v_pp))
        results[name] = (case["voltages"], v_pp, diff)
        print(f"{name:20s} largest difference = {diff:.2e} pu")

    worst = max(r[2] for r in results.values())
    print(f"\nLargest difference across all cases: {worst:.2e} pu (goal: under {GOAL_PU})")

    make_chart(results)
    shutil.copyfile(CHART_FILE, PUBLIC_CHART)
    print(f"Saved {CHART_FILE.relative_to(ROOT)} and {PUBLIC_CHART.relative_to(ROOT)}")

    return 0 if worst < GOAL_PU else 1


if __name__ == "__main__":
    sys.exit(main())
