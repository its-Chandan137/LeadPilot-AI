export const logger = {
  error(error: unknown) {
    if (process.env.NODE_ENV !== "test") {
      console.error(error);
    }
  }
};
