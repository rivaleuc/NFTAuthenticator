"""Tests for NFTAuthenticator cross-field anchor:
authentic == True  ⟹  similar_found normalizes to a no-source value."""
import json

import pytest


def verify(contract_module, gl_runtime):
    c = contract_module.NFTAuthenticator()
    key = c.verify_nft("https://example.com/nft/1", "CoolCats", "0xCreator")
    return c, key


@pytest.mark.parametrize(
    "llm_out,expected_authentic,expected_sf_empty",
    [
        ({"authentic": True, "confidence": "high", "similar_found": "none", "reasoning": "original work"}, True, True),
        ({"authentic": True, "confidence": "high", "similar_found": "", "reasoning": "no matches"}, True, True),
        ({"authentic": True, "confidence": "medium", "similar_found": "N/A", "reasoning": "clean"}, True, True),
        # Leader claims authentic but a REAL source exists -> forced to False.
        ({"authentic": True, "confidence": "high", "similar_found": "opensea.io/stolen", "reasoning": "match"}, False, False),
        ({"authentic": False, "confidence": "low", "similar_found": "knownartist.com", "reasoning": "copied"}, False, False),
        # garbage confidence -> low
        ({"authentic": False, "confidence": "???", "similar_found": "x.com/y", "reasoning": "dupe"}, False, False),
    ],
)
def test_anchor_holds(contract_module, gl_runtime, llm_out, expected_authentic, expected_sf_empty):
    gl_runtime.nondet.exec_prompt = lambda prompt, _o=llm_out, **kw: dict(_o)
    c, key = verify(contract_module, gl_runtime)
    rec = json.loads(c.verifications[key])
    assert rec["authentic"] is expected_authentic
    NO_SOURCE = contract_module._NO_SOURCE
    if rec["authentic"]:
        assert rec["similar_found"].strip().lower() in NO_SOURCE


def test_normalized_output_always_validates(contract_module, gl_runtime):
    weird = [
        {"authentic": True, "confidence": "HIGH", "similar_found": "NONE", "reasoning": "ok"},
        {"authentic": True, "confidence": "x", "similar_found": "stolen.com", "reasoning": "match"},
        {"authentic": "yes", "confidence": "", "similar_found": "", "reasoning": ""},
        {"confidence": "low", "reasoning": "missing keys"},
        {"authentic": True, "similar_found": "no similar sources found", "confidence": "medium", "reasoning": "clean"},
    ]
    for out in weird:
        gl_runtime.nondet.exec_prompt = lambda prompt, _o=out, **kw: dict(_o)
        c, key = verify(contract_module, gl_runtime)
        validator = gl_runtime.vm.last_validator
        ret = gl_runtime.vm.Return(gl_runtime.vm.last_leader_result)
        assert validator(ret) is True


def test_validator_rejects_bad_inputs(contract_module, gl_runtime):
    gl_runtime.nondet.exec_prompt = lambda prompt, **kw: {"authentic": True, "confidence": "high", "similar_found": "none", "reasoning": "ok"}
    c, key = verify(contract_module, gl_runtime)
    validator = gl_runtime.vm.last_validator
    R = gl_runtime.vm.Return

    bad = [
        "not-a-return",
        R("{bad"),
        # bad confidence enum
        R(json.dumps({"authentic": False, "confidence": "ultra", "similar_found": "x", "reasoning": "r"})),
        # authentic not bool
        R(json.dumps({"authentic": 1, "confidence": "low", "similar_found": "", "reasoning": "r"})),
        # similar_found not str
        R(json.dumps({"authentic": False, "confidence": "low", "similar_found": 5, "reasoning": "r"})),
        # empty reasoning
        R(json.dumps({"authentic": True, "confidence": "low", "similar_found": "none", "reasoning": "  "})),
        # ANCHOR violation: authentic True but real source present
        R(json.dumps({"authentic": True, "confidence": "high", "similar_found": "opensea.io/x", "reasoning": "r"})),
    ]
    for b in bad:
        assert validator(b) is False


def test_good_input_validates(contract_module, gl_runtime):
    gl_runtime.nondet.exec_prompt = lambda prompt, **kw: {"authentic": True, "confidence": "high", "similar_found": "none", "reasoning": "ok"}
    c, key = verify(contract_module, gl_runtime)
    validator = gl_runtime.vm.last_validator
    R = gl_runtime.vm.Return
    assert validator(R(json.dumps({"authentic": True, "confidence": "high", "similar_found": "none", "reasoning": "original"}))) is True
    assert validator(R(json.dumps({"authentic": False, "confidence": "low", "similar_found": "thief.com", "reasoning": "copied"}))) is True
