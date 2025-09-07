// services/promptService.ts

let prompts: Record<string, string> = {};
let isLoaded = false;

const loadPrompts = async (): Promise<Record<string, string>> => {
  if (isLoaded) return prompts;
  
  try {
    const response = await fetch('/prompts.json');
    if (response.ok) {
      prompts = await response.json();
    } else {
      throw new Error("Failed to load prompts.json");
    }
  } catch (error) {
    console.error('Failed to load prompts from file:', error);
    // Fallback: try to load from localStorage
    try {
      const savedPrompts = localStorage.getItem('customPrompts');
      if (savedPrompts) {
        prompts = JSON.parse(savedPrompts);
      }
    } catch (localError) {
      console.error('Failed to load prompts from localStorage:', localError);
      // Use default prompts as last resort
      prompts = {
        editFrame: "You are a video editing AI. Apply the user's edit request to the current frame.",
        editFrameBootstrap: "You are a video editing AI using bootstrapping mode. Use the edited previous frame as reference.",
        analyzeVideo: "You are an expert video analyst. Analyze the video and provide suggestions."
      };
    }
  }
  
  isLoaded = true;
  return prompts;
};

/**
 * An abstract system for retrieving and formatting prompts.
 */
export const promptService = {
  /**
   * Gets a prompt template by key and formats it with the provided variables.
   * @param key The key of the prompt in prompts.json (e.g., 'editFrame').
   * @param variables An optional object of key-value pairs to replace placeholders (e.g., {{key}}).
   * @returns The formatted prompt string.
   * @throws An error if the prompt key is not found.
   */
  async get(key: string, variables?: Record<string, string>): Promise<string> {
    await loadPrompts();
    
    const template = prompts[key];

    if (typeof template !== 'string') {
      throw new Error(`Prompt with key "${key}" not found or is not a string in prompts.json.`);
    }

    if (!variables) {
      return template;
    }

    // Replace all instances of {{variableName}} with the corresponding value.
    let formattedPrompt = template;
    for (const [variableName, value] of Object.entries(variables)) {
      // Using a regex with 'g' flag to replace all occurrences.
      const placeholder = new RegExp(`\\{\\{${variableName}\\}\\}`, 'g');
      formattedPrompt = formattedPrompt.replace(placeholder, String(value));
    }
    return formattedPrompt;
  },

  /**
   * Updates the prompts cache with new prompts
   * @param newPrompts The new prompts to cache
   */
  updatePrompts(newPrompts: Record<string, string>): void {
    prompts = { ...prompts, ...newPrompts };
  },

  /**
   * Gets all current prompts
   */
  async getAllPrompts(): Promise<Record<string, string>> {
    await loadPrompts();
    return { ...prompts };
  }
};