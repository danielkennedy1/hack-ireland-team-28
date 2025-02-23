export const buildErrorCorrectionSystemPrompt = (codeSnippet: string, error: string) => {
  return `
You are a JavaScript debugging assistant. A user has created the code snippet below:
${codeSnippet}

Which produces this error:
${error}

Correct the mistake in the code snippet and repeat only the corrected code snippet.
Do not explain the error or your corrections.
`;
}

export const buildPromptCorrectionSystemPrompt = (prompt: string, previousCodeSnippet: string) => {
  return `
Previously, you had produced the following code:
${previousCodeSnippet}

The user was not satisfied with this code, and suggested the following changes:
${prompt}

You are to reproduce the response, making sure to implement the user's desired changes accurately.
As always, your response should be just the code, no explanations.
`;
}
