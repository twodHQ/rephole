export const TYPESCRIPT_QUERY = `
  ;; Capture Class Declarations
  (class_declaration
    name: (type_identifier) @name
  ) @block

  ;; Capture Method Definitions
  (method_definition
    name: (property_identifier) @name
  ) @block

  ;; Capture Function Declarations
  (function_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Exported Arrow Functions (const x = () => {})
  (lexical_declaration
    (variable_declarator
      name: (identifier) @name
      value: (arrow_function)
    )
  ) @block
  
  ;; Capture Interfaces (Good for context)
  (interface_declaration
    name: (type_identifier) @name
  ) @block
`;
