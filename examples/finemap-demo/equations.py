"""Native equations for the fine-mapping demo (see omml_lib.py)."""
import os, sys
sys.path.insert(0, os.environ["RESEARCH_SLIDES"])
from omml_lib import *

def zj2():
    return ssubsup(r("z"), r("j"), r("2"))

# ABF_j = sqrt(V / (V + W)) * exp( z_j^2 W / (2 (V + W)) )
EQS["abf"] = lambda: omath(
    ssub(r("ABF", True), r("j")), r(" = "),
    rad(frac(r("V"), r("V + W"))), r(" "),
    r("exp", True), delim(frac(zj2() + r(" W"), r("2") + delim(r("V + W")))),
)
# PIP_j = ABF_j / sum_k ABF_k
EQS["pip"] = lambda: omath(
    ssub(r("PIP", True), r("j")), r(" = "),
    frac(ssub(r("ABF", True), r("j")), nary(r("k"), ssub(r("ABF", True), r("k")))),
)
EQ_SIZE = {"abf": 1800, "pip": 1800}

if __name__ == "__main__":
    main(EQS, EQ_SIZE)
