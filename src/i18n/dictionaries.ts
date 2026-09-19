import { en } from "./dictionaries/en";
import { it } from "./dictionaries/it";
import type { Locale } from "./config";
import type { Dictionary } from "./types";

const dictionaries = { en, it } satisfies Record<Locale, Dictionary>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateNode(
  candidate: unknown,
  reference: Record<string, unknown>,
  path: string,
): void {
  if (!isRecord(candidate)) {
    throw new TypeError(`Invalid dictionary object at ${path}`);
  }

  const expectedKeys = Object.keys(reference).sort();
  const actualKeys = Object.keys(candidate).sort();

  if (
    expectedKeys.length !== actualKeys.length ||
    expectedKeys.some((key, index) => key !== actualKeys[index])
  ) {
    throw new TypeError(`Invalid dictionary keys at ${path}`);
  }

  for (const key of expectedKeys) {
    const referenceValue = reference[key];
    const candidateValue = candidate[key];
    const childPath = `${path}.${key}`;

    if (typeof referenceValue === "string") {
      if (typeof candidateValue !== "string" || candidateValue.trim() === "") {
        throw new TypeError(`Invalid dictionary string at ${childPath}`);
      }
      continue;
    }

    if (!isRecord(referenceValue)) {
      throw new TypeError(`Invalid dictionary reference at ${childPath}`);
    }

    validateNode(candidateValue, referenceValue, childPath);
  }
}

export function assertDictionary(candidate: unknown): asserts candidate is Dictionary {
  validateNode(candidate, en, "dictionary");
}

for (const dictionary of Object.values(dictionaries)) {
  assertDictionary(dictionary);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
