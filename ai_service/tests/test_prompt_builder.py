from app.core.prompt_builder import MAX_HISTORY_TURNS, build_query_prompt, extract_citations


def test_build_query_prompt_keeps_recent_history_and_appends_question():
    history = [
        {"role": "user", "content": f"user-{index}"}
        if index % 2 == 0
        else {"role": "assistant", "content": f"assistant-{index}"}
        for index in range(MAX_HISTORY_TURNS + 4)
    ]
    chunks = [
        {
            "file_path": "src/auth.py",
            "start_line": 10,
            "end_line": 20,
            "content": "def authenticate():\n    return True\n",
        }
    ]

    messages = build_query_prompt(
        question="Where is auth handled?",
        retrieved_chunks=chunks,
        conversation_history=history,
    )

    assert messages[0]["role"] == "system"
    assert len(messages) == 1 + MAX_HISTORY_TURNS + 1
    assert messages[1]["content"] == history[-MAX_HISTORY_TURNS]["content"]
    assert messages[-1]["role"] == "user"
    assert "Question: Where is auth handled?" in messages[-1]["content"]
    assert "[src/auth.py:10-20]" in messages[-1]["content"]


def test_extract_citations_deduplicates_and_matches_chunk_content():
    answer = (
        "Authentication is checked in `authenticate` [src/auth.py:10-20]. "
        "The same citation appears twice [src/auth.py:10-20]."
    )
    chunks = [
        {
            "file_path": "src/auth.py",
            "start_line": 8,
            "end_line": 24,
            "content": "def authenticate():\n    return True\n",
            "score": 0.91,
        }
    ]

    citations = extract_citations(answer, chunks)

    assert len(citations) == 1
    assert citations[0]["file"] == "src/auth.py"
    assert citations[0]["start_line"] == 10
    assert citations[0]["end_line"] == 20
    assert "authenticate" in citations[0]["snippet"]
    assert citations[0]["score"] == 0.91


def test_build_query_prompt_removes_duplicate_current_question_from_history():
    chunks = [
        {
            "file_path": "src/routes/chat.ts",
            "start_line": 1,
            "end_line": 20,
            "content": "export const chatRoutes = Router();",
        }
    ]

    messages = build_query_prompt(
        question="Why is my answer repeated?",
        retrieved_chunks=chunks,
        conversation_history=[
            {"role": "user", "content": "Why is my answer repeated?"},
            {"role": "assistant", "content": "Earlier answer."},
        ],
    )

    user_messages = [message["content"] for message in messages if message["role"] == "user"]
    assert len(user_messages) == 1
    assert user_messages[0].count("Why is my answer repeated?") == 1


def test_build_query_prompt_deduplicates_retrieved_chunks():
    duplicate_chunk = {
        "file_path": "src/auth.py",
        "start_line": 10,
        "end_line": 20,
        "content": "def authenticate():\n    return True\n",
    }

    messages = build_query_prompt(
        question="Where is auth handled?",
        retrieved_chunks=[duplicate_chunk, duplicate_chunk.copy()],
        conversation_history=[],
    )

    assert messages[-1]["content"].count("[src/auth.py:10-20]") == 1
