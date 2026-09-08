import { jsonLanguage } from "@codemirror/lang-json";

export function findingLocation(source: string, path: string) {
  // Decode mcpeek's restricted JSON paths, including JSON-escaped object keys.
  const segment = /\.([A-Za-z_][A-Za-z0-9_]*)|\[("(?:\\.|[^"\\])*")\]/gy;
  const keys: string[] = [];
  if (!path.startsWith("$")) {
    return null;
  }
  let offset = 1;
  while (offset < path.length) {
    segment.lastIndex = offset;
    const match = segment.exec(path);
    if (!match) {
      return null;
    }
    keys.push(match[1] ?? JSON.parse(match[2]));
    offset = segment.lastIndex;
  }

  let object = jsonLanguage.parser.parse(source).topNode.firstChild;
  let location: { from: number; to: number } | null = null;
  for (const key of keys) {
    if (object?.name !== "Object") {
      return null;
    }
    const property = object.getChildren("Property").find((candidate) => {
      const name = candidate.getChild("PropertyName");
      return name && JSON.parse(source.slice(name.from, name.to)) === key;
    });
    if (!property) {
      return null;
    }
    location = { from: property.from, to: property.to };
    object = property.lastChild;
  }
  return location;
}
