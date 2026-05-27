export type ContactImportRow = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  source: string;
  notes: string;
};

const headerAliases: Record<string, keyof Omit<ContactImportRow, "tags"> | "tags"> = {
  first: "firstName",
  firstname: "firstName",
  "first name": "firstName",
  last: "lastName",
  lastname: "lastName",
  "last name": "lastName",
  email: "email",
  "email address": "email",
  phone: "phone",
  "phone number": "phone",
  tags: "tags",
  tag: "tags",
  source: "source",
  notes: "notes",
  note: "notes"
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

export function parseContactCsv(text: string) {
  const rows = parseCsv(text);
  const [headerRow, ...dataRows] = rows;
  if (!headerRow) return [];

  const headers = headerRow.map((header) => headerAliases[normalizeHeader(header)]);
  return dataRows
    .map((row) => {
      const contact: ContactImportRow = {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        tags: [],
        source: "",
        notes: ""
      };

      row.forEach((cell, index) => {
        const key = headers[index];
        if (!key) return;
        if (key === "tags") {
          contact.tags = cell
            .split(/[;|,]/)
            .map((tag) => tag.trim())
            .filter(Boolean);
        } else {
          contact[key] = cell.trim();
        }
      });

      return contact;
    })
    .filter((contact) => contact.firstName || contact.lastName || contact.email || contact.phone);
}

export function escapeCsvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
