export function getErrorMessage(error) {
  if (!error.response) {
    return "Network error — check your connection and try again";
  }
  return error.response.data?.message || "Something went wrong";
}

export function getFieldErrors(error) {
  const errors = error.response?.data?.errors;
  if (!Array.isArray(errors)) {
    return {};
  }
  return errors.reduce((acc, item) => {
    if (item.path && !acc[item.path]) {
      acc[item.path] = item.msg;
    }
    return acc;
  }, {});
}
