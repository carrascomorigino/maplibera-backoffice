export function moveToTop(ids: string[], id: string): string[] {
  const index = ids.indexOf(id);
  if (index <= 0) {
    return [...ids];
  }
  const result = [...ids];
  result.splice(index, 1);
  result.unshift(id);
  return result;
}

export function moveUp(ids: string[], id: string): string[] {
  const index = ids.indexOf(id);
  if (index <= 0) {
    return [...ids];
  }
  const result = [...ids];
  [result[index - 1], result[index]] = [result[index], result[index - 1]];
  return result;
}

export function moveDown(ids: string[], id: string): string[] {
  const index = ids.indexOf(id);
  if (index === -1 || index === ids.length - 1) {
    return [...ids];
  }
  const result = [...ids];
  [result[index], result[index + 1]] = [result[index + 1], result[index]];
  return result;
}
