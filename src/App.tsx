import DynamicForm from "./components/form/DynamicForm";

function App() {
  return (
    <DynamicForm
      fields={[
        {
          id: "1",
          type: "text-input",
          props: {
            label: "First Name",
            placeholder: "Enter your first name",
            name: "firstName",
            value: "",
          },
        },
        {
          id: "2",
          type: "text-input",
          props: {
            label: "Last Name",
            placeholder: "Enter your last name",
            name: "lastName",
            value: "",
          },
        },
        {
          id: "3",
          type: "number-input",
          props: {
            label: "Age",
            placeholder: "Enter your age",
            name: "age",
            value: "",
          },
        },
      ]}
      apiUrl="https://jsonplaceholder.typicode.com/posts"
    />
  );
}

export default App;
