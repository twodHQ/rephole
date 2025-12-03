/**
 * Tree-sitter queries for extracting semantic code chunks.
 * Each query captures @block (the code block) and @name (identifier) nodes.
 */

// ============================================================================
// TypeScript / JavaScript Family
// ============================================================================

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

  ;; Capture Type Aliases
  (type_alias_declaration
    name: (type_identifier) @name
  ) @block

  ;; Capture Enum Declarations
  (enum_declaration
    name: (identifier) @name
  ) @block
`;

export const TSX_QUERY = TYPESCRIPT_QUERY;

export const JAVASCRIPT_QUERY = `
  ;; Capture Class Declarations
  (class_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Method Definitions
  (method_definition
    name: (property_identifier) @name
  ) @block

  ;; Capture Function Declarations
  (function_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Arrow Functions assigned to variables
  (lexical_declaration
    (variable_declarator
      name: (identifier) @name
      value: (arrow_function)
    )
  ) @block

  ;; Capture Variable Function Expressions
  (variable_declaration
    (variable_declarator
      name: (identifier) @name
      value: (function_expression)
    )
  ) @block
`;

// ============================================================================
// Python
// ============================================================================

export const PYTHON_QUERY = `
  ;; Capture Class Definitions
  (class_definition
    name: (identifier) @name
  ) @block

  ;; Capture Function Definitions
  (function_definition
    name: (identifier) @name
  ) @block

  ;; Capture Decorated Definitions (methods with @decorator)
  (decorated_definition
    (function_definition
      name: (identifier) @name
    )
  ) @block
`;

// ============================================================================
// Java
// ============================================================================

export const JAVA_QUERY = `
  ;; Capture Class Declarations
  (class_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Interface Declarations
  (interface_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Method Declarations
  (method_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Constructor Declarations
  (constructor_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Enum Declarations
  (enum_declaration
    name: (identifier) @name
  ) @block
`;

// ============================================================================
// C
// ============================================================================

export const C_QUERY = `
  ;; Capture Function Definitions
  (function_definition
    declarator: (function_declarator
      declarator: (identifier) @name
    )
  ) @block

  ;; Capture Struct Definitions
  (struct_specifier
    name: (type_identifier) @name
  ) @block

  ;; Capture Enum Definitions
  (enum_specifier
    name: (type_identifier) @name
  ) @block

  ;; Capture Typedef Declarations
  (type_definition
    declarator: (type_identifier) @name
  ) @block
`;

// ============================================================================
// C++
// ============================================================================

export const CPP_QUERY = `
  ;; Capture Function Definitions
  (function_definition
    declarator: (function_declarator
      declarator: (identifier) @name
    )
  ) @block

  ;; Capture Class Specifiers
  (class_specifier
    name: (type_identifier) @name
  ) @block

  ;; Capture Struct Specifiers
  (struct_specifier
    name: (type_identifier) @name
  ) @block

  ;; Capture Namespace Definitions
  (namespace_definition
    name: (identifier) @name
  ) @block

  ;; Capture Template Declarations
  (template_declaration) @block
`;

// ============================================================================
// C#
// ============================================================================

export const CSHARP_QUERY = `
  ;; Capture Class Declarations
  (class_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Interface Declarations
  (interface_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Method Declarations
  (method_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Constructor Declarations
  (constructor_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Property Declarations
  (property_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Namespace Declarations
  (namespace_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Enum Declarations
  (enum_declaration
    name: (identifier) @name
  ) @block
`;

// ============================================================================
// Objective-C
// ============================================================================

export const OBJC_QUERY = `
  ;; Capture Class Interface Declarations
  (class_interface
    name: (identifier) @name
  ) @block

  ;; Capture Class Implementation
  (class_implementation
    name: (identifier) @name
  ) @block

  ;; Capture Method Definitions
  (method_definition) @block

  ;; Capture Protocol Declarations
  (protocol_declaration
    name: (identifier) @name
  ) @block
`;

// ============================================================================
// Go
// ============================================================================

export const GO_QUERY = `
  ;; Capture Function Declarations
  (function_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Method Declarations
  (method_declaration
    name: (field_identifier) @name
  ) @block

  ;; Capture Type Declarations (struct, interface)
  (type_declaration
    (type_spec
      name: (type_identifier) @name
    )
  ) @block
`;

// ============================================================================
// Rust
// ============================================================================

export const RUST_QUERY = `
  ;; Capture Function Items
  (function_item
    name: (identifier) @name
  ) @block

  ;; Capture Impl Items
  (impl_item
    type: (type_identifier) @name
  ) @block

  ;; Capture Struct Items
  (struct_item
    name: (type_identifier) @name
  ) @block

  ;; Capture Enum Items
  (enum_item
    name: (type_identifier) @name
  ) @block

  ;; Capture Trait Items
  (trait_item
    name: (type_identifier) @name
  ) @block

  ;; Capture Mod Items
  (mod_item
    name: (identifier) @name
  ) @block
`;

// ============================================================================
// Ruby
// ============================================================================

export const RUBY_QUERY = `
  ;; Capture Class Definitions
  (class
    name: (constant) @name
  ) @block

  ;; Capture Module Definitions
  (module
    name: (constant) @name
  ) @block

  ;; Capture Method Definitions
  (method
    name: (identifier) @name
  ) @block

  ;; Capture Singleton Method Definitions
  (singleton_method
    name: (identifier) @name
  ) @block
`;

// ============================================================================
// PHP
// ============================================================================

export const PHP_QUERY = `
  ;; Capture Class Declarations
  (class_declaration
    name: (name) @name
  ) @block

  ;; Capture Interface Declarations
  (interface_declaration
    name: (name) @name
  ) @block

  ;; Capture Function Definitions
  (function_definition
    name: (name) @name
  ) @block

  ;; Capture Method Declarations
  (method_declaration
    name: (name) @name
  ) @block

  ;; Capture Trait Declarations
  (trait_declaration
    name: (name) @name
  ) @block
`;

// ============================================================================
// Lua
// ============================================================================

export const LUA_QUERY = `
  ;; Capture Function Declarations
  (function_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Local Function Declarations
  (local_function_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Function Definitions (method style)
  (function_declaration
    name: (dot_index_expression) @name
  ) @block
`;

// ============================================================================
// Kotlin
// ============================================================================

export const KOTLIN_QUERY = `
  ;; Capture Class Declarations
  (class_declaration
    (type_identifier) @name
  ) @block

  ;; Capture Function Declarations
  (function_declaration
    (simple_identifier) @name
  ) @block

  ;; Capture Object Declarations
  (object_declaration
    (type_identifier) @name
  ) @block

  ;; Capture Interface Declarations
  (class_declaration
    (type_identifier) @name
  ) @block
`;

// ============================================================================
// Swift
// ============================================================================

export const SWIFT_QUERY = `
  ;; Capture Class Declarations
  (class_declaration
    name: (type_identifier) @name
  ) @block

  ;; Capture Function Declarations
  (function_declaration
    name: (simple_identifier) @name
  ) @block

  ;; Capture Struct Declarations
  (struct_declaration
    name: (type_identifier) @name
  ) @block

  ;; Capture Protocol Declarations
  (protocol_declaration
    name: (type_identifier) @name
  ) @block

  ;; Capture Enum Declarations
  (enum_declaration
    name: (type_identifier) @name
  ) @block
`;

// ============================================================================
// Scala
// ============================================================================

export const SCALA_QUERY = `
  ;; Capture Class Definitions
  (class_definition
    name: (identifier) @name
  ) @block

  ;; Capture Object Definitions
  (object_definition
    name: (identifier) @name
  ) @block

  ;; Capture Trait Definitions
  (trait_definition
    name: (identifier) @name
  ) @block

  ;; Capture Function Definitions
  (function_definition
    name: (identifier) @name
  ) @block
`;

// ============================================================================
// Dart
// ============================================================================

export const DART_QUERY = `
  ;; Capture Class Declarations
  (class_definition
    name: (identifier) @name
  ) @block
  
  ;; Capture Method Declarations
  (method_signature
    name: (identifier) @name
  ) @block
  
  ;; Capture Function Declarations
  (function_signature
    name: (identifier) @name
  ) @block
  
  ;; Capture Enum Declarations
  (enum_declaration
    name: (identifier) @name
  ) @block
`;

// ============================================================================
// Elixir
// ============================================================================

export const ELIXIR_QUERY = `
  ;; Capture Module Definitions
  (call
    target: (identifier) @_defmodule
    (arguments (alias) @name)
    (#eq? @_defmodule "defmodule")
  ) @block

  ;; Capture Function Definitions
  (call
    target: (identifier) @_def
    (arguments (call target: (identifier) @name))
    (#match? @_def "^def")
  ) @block
`;

// ============================================================================
// OCaml
// ============================================================================

export const OCAML_QUERY = `
  ;; Capture Let Bindings
  (let_binding
    pattern: (value_name) @name
  ) @block

  ;; Capture Type Definitions
  (type_binding
    name: (type_constructor) @name
  ) @block

  ;; Capture Module Definitions
  (module_binding
    name: (module_name) @name
  ) @block
`;

// ============================================================================
// Zig
// ============================================================================

export const ZIG_QUERY = `
  ;; Capture Function Declarations
  (FnProto
    name: (IDENTIFIER) @name
  ) @block

  ;; Capture Struct Declarations
  (ContainerDecl) @block

  ;; Capture Variable Declarations
  (VarDecl
    name: (IDENTIFIER) @name
  ) @block
`;

// ============================================================================
// Solidity
// ============================================================================

export const SOLIDITY_QUERY = `
  ;; Capture Contract Definitions
  (contract_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Function Definitions
  (function_definition
    name: (identifier) @name
  ) @block

  ;; Capture Event Definitions
  (event_definition
    name: (identifier) @name
  ) @block

  ;; Capture Struct Definitions
  (struct_declaration
    name: (identifier) @name
  ) @block

  ;; Capture Interface Definitions
  (interface_declaration
    name: (identifier) @name
  ) @block
`;

// ============================================================================
// ReScript
// ============================================================================

export const RESCRIPT_QUERY = `
  ;; Capture Let Bindings
  (let_binding
    pattern: (value_identifier) @name
  ) @block

  ;; Capture Type Declarations
  (type_declaration
    name: (type_identifier) @name
  ) @block

  ;; Capture Module Declarations
  (module_declaration
    name: (module_identifier) @name
  ) @block
`;

// ============================================================================
// Emacs Lisp
// ============================================================================

export const ELISP_QUERY = `
  ;; Capture Function Definitions
  (function_definition
    name: (symbol) @name
  ) @block

  ;; Capture Special Forms
  (special_form) @block
`;

// ============================================================================
// HTML
// ============================================================================

export const HTML_QUERY = `
  ;; Capture Script Elements
  (script_element) @block

  ;; Capture Style Elements  
  (style_element) @block

  ;; Capture Elements with id attribute
  (element
    (start_tag
      (attribute
        (attribute_name) @_attr
        (quoted_attribute_value) @name
      )
    )
    (#eq? @_attr "id")
  ) @block
`;

// ============================================================================
// CSS
// ============================================================================

export const CSS_QUERY = `
  ;; Capture Rule Sets
  (rule_set
    (selectors) @name
  ) @block

  ;; Capture Media Statements
  (media_statement) @block

  ;; Capture Keyframes Statements
  (keyframes_statement
    name: (keyframes_name) @name
  ) @block
`;

// ============================================================================
// Vue
// ============================================================================

export const VUE_QUERY = `
  ;; Capture Script Elements (Vue component logic)
  (script_element) @block

  ;; Capture Style Elements
  (style_element) @block

  ;; Capture Template Element
  (template_element) @block
`;

// ============================================================================
// JSON
// ============================================================================

export const JSON_QUERY = `
  ;; Capture Object with string keys
  (pair
    key: (string) @name
  ) @block

  ;; Capture Top-level object
  (object) @block
`;

// ============================================================================
// YAML
// ============================================================================

export const YAML_QUERY = `
  ;; Capture Block Mapping Pairs (top-level keys)
  (block_mapping_pair
    key: (flow_node) @name
  ) @block

  ;; Capture Block Sequences
  (block_sequence) @block
`;

// ============================================================================
// TOML
// ============================================================================

export const TOML_QUERY = `
  ;; Capture Tables
  (table
    (bare_key) @name
  ) @block

  ;; Capture Array of Tables
  (table_array_element
    (bare_key) @name
  ) @block

  ;; Capture Key-Value Pairs
  (pair
    (bare_key) @name
  ) @block
`;

// ============================================================================
// Markdown
// ============================================================================

export const MARKDOWN_QUERY = `
  ;; Capture ATX Headings
  (atx_heading) @block

  ;; Capture Fenced Code Blocks
  (fenced_code_block) @block

  ;; Capture Sections (heading + content)
  (section) @block
`;

// ============================================================================
// Bash / Shell
// ============================================================================

export const BASH_QUERY = `
  ;; Capture Function Definitions
  (function_definition
    name: (word) @name
  ) @block

  ;; Capture Command with variable assignment
  (variable_assignment
    name: (variable_name) @name
  ) @block
`;

// ============================================================================
// Elm
// ============================================================================

export const ELM_QUERY = `
  ;; Capture Type Declarations
  (type_declaration
    (type_declaration_left
      (upper_case_identifier) @name
    )
  ) @block

  ;; Capture Value Declarations (functions)
  (value_declaration
    (function_declaration_left
      (lower_case_identifier) @name
    )
  ) @block

  ;; Capture Type Alias Declarations
  (type_alias_declaration
    (type_alias_declaration_left
      (upper_case_identifier) @name
    )
  ) @block
`;

// ============================================================================
// TLA+
// ============================================================================

export const TLAPLUS_QUERY = `
  ;; Capture Module Definitions
  (module
    name: (identifier) @name
  ) @block

  ;; Capture Operator Definitions
  (operator_definition
    name: (identifier) @name
  ) @block
`;

// ============================================================================
// QL (CodeQL)
// ============================================================================

export const QL_QUERY = `
  ;; Capture Class Declarations
  (classlessPredicate
    name: (predicateName) @name
  ) @block

  ;; Capture Predicate Declarations
  (memberPredicate
    name: (predicateName) @name
  ) @block

  ;; Capture Module Declarations
  (module
    name: (moduleName) @name
  ) @block
`;

// ============================================================================
// Embedded Template (ERB, EJS, etc.)
// ============================================================================

export const EMBEDDED_TEMPLATE_QUERY = `
  ;; Capture Template Directives
  (directive) @block

  ;; Capture Output Directives
  (output_directive) @block

  ;; Capture Content
  (content) @block
`;

// ============================================================================
// SystemRDL
// ============================================================================

export const SYSTEMRDL_QUERY = `
  ;; Capture Component Definitions
  (component_def
    (component_named_def
      (component_id) @name
    )
  ) @block

  ;; Capture Field Definitions
  (field_def
    (field_named_def
      (field_id) @name
    )
  ) @block
`;

// ============================================================================
// Generic Fallback Query (minimal capture)
// ============================================================================

export const GENERIC_QUERY = `
  ;; Generic fallback - captures top-level declarations
  (program) @block
`;
