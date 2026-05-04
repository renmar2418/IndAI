/**
 * IndAI — Error Handling Utility
 * Maps technical errors to user-friendly messages and logs technical details.
 */

export const getUserFriendlyErrorMessage = (error: any): string => {
  // Log the actual technical error to the console for developers
  const technicalDetails = error.response?.data || error.message || error;
  console.error("[Technical Error Log]:", {
    status: error.response?.status,
    details: technicalDetails,
    config: {
      url: error.config?.url,
      method: error.config?.method,
    }
  });

  // Default non-technical message
  let message = "Something went wrong. Please try again later.";

  if (!error.response) {
    // Network errors (no response)
    message = "Connection failed. Please check your internet and try again.";
  } else {
    const status = error.response.status;

    switch (status) {
      case 400:
        // Validation errors might be semi-technical, but we should make them friendly
        message = "The request was invalid. Please check your input.";
        break;
      case 401:
        message = "Your session has expired. Please log in again.";
        break;
      case 403:
        message = "You don't have permission to perform this action.";
        break;
      case 404:
        message = "The requested resource could not be found.";
        break;
      case 429:
        // Check for specific demo limit message which is already friendly
        if (error.response.data?.error?.includes("limit for free demo scans")) {
          message = error.response.data.error;
        } else {
          message = "Too many requests. Please slow down and try again in a moment.";
        }
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        message = "Our servers are experiencing technical difficulties. We've been notified and are working on it.";
        break;
      default:
        // Use backend message if it's already a simple string, otherwise use default
        const backendError = error.response.data?.error;
        if (typeof backendError === "string" && backendError.length < 100 && !backendError.includes("_")) {
            // If it's a short, non-snake_case string, it's likely intended for users
            message = backendError;
        } else {
            message = "Action failed. Please try again later.";
        }
    }
  }

  return message;
};
