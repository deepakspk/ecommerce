export function submitEsewaForm({ formUrl, fields }) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = formUrl;

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}
