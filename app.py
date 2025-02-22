import os
import re
import openai
from fastapi import FastAPI, Body

# Set your OpenAI API key via environment variable
openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()


def extract_dimensions_mm(prompt: str):
    """
    Parse all 'XXmm' occurrences from the prompt and return as floats.
    Example: "A wrench that is 60mm long and 10mm wide" -> [60.0, 10.0]
    """
    dims = re.findall(r"(\d+(?:\.\d+)?)\s*mm", prompt.lower())
    return [float(d) for d in dims]


def build_bounding_box_instructions(dims):
    """
    Given a list of dimension floats, create a bounding box that
    at least spans [0, 0, 0] to [X, Y, Z] in mm.

    - If only one dimension is found (e.g. 60mm), treat it as length in X,
      and pick some arbitrary Y=10, Z=10.
    - If two dims, treat them as X, Y, with Z=10.
    - If three or more, use the first three as X, Y, Z.
    """
    if not dims:
        # Default 10x10x10 if nothing is found
        x, y, z = 10, 10, 10
    elif len(dims) == 1:
        x = dims[0]
        y = 10
        z = 10
    elif len(dims) == 2:
        x, y = dims[0], dims[1]
        z = 10
    else:
        x, y, z = dims[0], dims[1], dims[2]

    # Ensure none are zero
    x = max(x, 1)
    y = max(y, 1)
    z = max(z, 1)

    # Return an instruction string for GPT
    return (
        f"Dimensions to span at least from (0,0,0) to ({x},{y},{z}) in mm. "
        "Ensure the STL coordinates use these as approximate bounding box.\n"
    )


@app.post("/generate-model")
def generate_model(prompt: str = Body(..., embed=True)):
    """
    Example usage:
      curl -X POST -H "Content-Type: application/json" \
           -d '{"prompt":"A wrench that is 60mm long"}' \
           http://127.0.0.1:8000/generate-model
    """

    # 1) Parse numeric dimensions from the prompt.
    dims = extract_dimensions_mm(prompt)

    # 2) Construct bounding box instructions based on dims.
    bounding_box_text = build_bounding_box_instructions(dims)

    # 3) Build the system message with extra instructions to ensure non-zero geometry.
    system_message = f"""\
You are a 3D modeling assistant that outputs valid ASCII STL for the user's request.
1) Always produce valid ASCII STL with at least 2 triangles (non-zero volume).
2) {bounding_box_text}
3) Output only ASCII STL, no commentary, no code.
4) If the shape is complex (like a wrench), produce an approximate shape with realistic coordinates within the bounding box.
"""

    # We have 2 messages: system, user
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": prompt},
    ]

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=1500,
            temperature=0.7,
        )
        stl_text = response.choices[0].message.content.strip()
    except Exception as e:
        return {"error": str(e)}

    # 4) Save the AI-generated STL to a file
    file_path = "model.stl"
    with open(file_path, "w") as f:
        f.write(stl_text)

    return {
        "message": "AI-generated STL saved (with inferred bounding box).",
        "file_saved": file_path,
        "prompt_used": prompt,
    }
