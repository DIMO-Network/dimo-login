export const pollForCondition = async (
  fetchFunction: () => Promise<boolean>,
  maxAttempts = 10,
  intervalMs = 5000,
): Promise<boolean> => {
  let attempts = 0;

  while (attempts < maxAttempts) {
    if (await fetchFunction()) return true;

    console.log(`Attempt ${attempts + 1}: Condition not met, retrying...`);
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  console.log('Max attempts reached, condition not met.');
  return false;
};
