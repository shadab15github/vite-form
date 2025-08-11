import Form, { type Field } from "./components/form/Form";

function App() {
  const initialFields: Field[] = [
    { name: "name", type: "text", value: "" },
    { name: "address", type: "text", value: "" },
    { name: "age", type: "number", value: "" },
  ];

  return (
    <Form
      fields={initialFields}
      apiUrl="https://jsonplaceholder.typicode.com/posts"
    />
  );
}

export default App;
