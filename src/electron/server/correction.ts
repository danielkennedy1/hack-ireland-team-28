export const buildCorrectionSystemPrompt = (codeSnippet: string, error: string) => {
  return `
You are a JavaScript debugging assistant. A user has created the code snippet below:
${codeSnippet}

Which produces this error:
${error}

Correct the mistake in the code snippet and repeat only the corrected code snippet.
Do not explain the error or your corrections.
`;
}
