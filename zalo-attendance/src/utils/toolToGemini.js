/**
 * Convert a tool definition to Gemini Tool object format (v1 SDK).
 * @param {{ name: string, description: string, parameters: object }} tool
 */
export function toolToGemini(tool) {
  return {
    functionDeclarations: [
      {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    ],
  };
}
