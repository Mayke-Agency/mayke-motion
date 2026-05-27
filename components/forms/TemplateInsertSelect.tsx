"use client";

type TemplateOption = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

type TemplateInsertSelectProps = {
  templates: TemplateOption[];
};

export function TemplateInsertSelect({ templates }: TemplateInsertSelectProps) {
  if (!templates.length) return null;

  return (
    <div className="field">
      <label htmlFor="template-insert">Insert template</label>
      <select
        className="select"
        id="template-insert"
        defaultValue=""
        onChange={(event) => {
          const template = templates.find((item) => item.id === event.currentTarget.value);
          const form = event.currentTarget.form;
          const subject = form?.elements.namedItem("subject");
          const body = form?.elements.namedItem("body");

          if (template && subject instanceof HTMLInputElement) subject.value = template.subject;
          if (template && body instanceof HTMLTextAreaElement) body.value = template.body;
        }}
      >
        <option value="">Choose a saved template</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>
    </div>
  );
}
