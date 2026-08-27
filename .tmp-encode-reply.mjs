// Minimal encodeReply equivalent for a single-FormData server action call
// (Next fetchServerAction body). Matches react-server-dom-webpack:
//   - part "0"     : JSON of the args array referencing the outlined FormData
//                    ("$K1" -> FormData outlined at id 1, hex)
//   - part "_1_<k>": raw field values (prefix "_" + id + "_")
export function encodeReply(args) {
  const fd = args[0];
  const fields = [["0", JSON.stringify(["$K1"])]];
  for (const [k, v] of fd.entries()) fields.push([`_1_${k}`, String(v)]);
  return fields;
}

export function buildMultipart(fields) {
  const boundary = "----CodebuffFormBoundary" + Math.random().toString(36).slice(2);
  const parts = [];
  for (const [name, value] of fields) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
    );
  }
  parts.push(`--${boundary}--\r\n`);
  return { body: parts.join(""), contentType: `multipart/form-data; boundary=${boundary}` };
}