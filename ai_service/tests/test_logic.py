import pytest
from app.core.prompt_builder import extract_citations
from app.core.symbol_index import iter_symbol_candidates, merge_symbol_results
from app.models.schemas import SymbolResult

def test_extract_citations_handles_various_formats():
    # Test valid citation
    answer = "The code is in [src/auth.py:10-20]."
    chunks = [{"file_path": "src/auth.py", "start_line": 5, "end_line": 25, "content": "test code", "score": 0.9}]
    citations = extract_citations(answer, chunks)
    assert len(citations) == 1
    assert citations[0]["file"] == "src/auth.py"
    
    # Test invalid format (missing colon)
    answer = "No citation [src/auth.py 10-20]"
    assert len(extract_citations(answer, chunks)) == 0

    # Test multiple citations
    answer = "Check [a.py:1-2] and [b.py:3-4]"
    chunks = [
        {"file_path": "a.py", "start_line": 1, "end_line": 5, "content": "a", "score": 0.8},
        {"file_path": "b.py", "start_line": 10, "end_line": 20, "content": "b", "score": 0.7}
    ]
    citations = extract_citations(answer, chunks)
    assert len(citations) == 2

def test_symbol_merging_deduplicates_overlapping_chunks():
    # Two chunks containing the same function due to overlap
    chunk_payloads = [
        {
            "file_path": "auth.py",
            "start_line": 1,
            "end_line": 50,
            "function_names": ["login"],
            "class_names": ["AuthManager"]
        },
        {
            "file_path": "auth.py",
            "start_line": 40,
            "end_line": 90,
            "function_names": ["login", "logout"],
            "method_names": ["init_db"]
        }
    ]
    
    candidates = iter_symbol_candidates(chunk_payloads)
    # login (twice), AuthManager (once), logout (once), init_db (once)
    assert len(candidates) == 5
    
    merged = merge_symbol_results(candidates)
    
    # login, AuthManager, logout, init_db should remain
    # Deduplicated by (name, kind, file)
    assert len(merged) == 4
    
    # login should have merged line range
    login = next(s for s in merged if s.name == "login")
    assert login.start_line == 1
    assert login.end_line == 90
    
    # init_db should have correct kind
    init_db = next(s for s in merged if s.name == "init_db")
    assert init_db.kind == "method"

def test_symbol_result_sorting():
    symbols = [
        SymbolResult(name="zeta", kind="function", file="z.py", start_line=10, end_line=20),
        SymbolResult(name="alpha", kind="function", file="a.py", start_line=5, end_line=15),
        SymbolResult(name="beta", kind="class", file="a.py", start_line=1, end_line=100),
    ]
    
    merged = merge_symbol_results(symbols)
    # Sorted by file, then start_line
    assert merged[0].file == "a.py"
    assert merged[0].name == "beta" # start_line 1
    assert merged[1].name == "alpha" # start_line 5
    assert merged[2].name == "zeta"
