import { defaultErrorMessages } from "./constant.js";

const headings = Array.from({ length: 5 }, (_, i) => `<h${i + 1}>`).join("");
const allowedTags = `${headings}<a><b><p><i><em><strong><ul><li><ol>`;

export function stripTags(input, allowed = allowedTags) {
  if (typeof input !== "string") {
    return input;
  }

  allowed =
    `<${allowed || ""}>`.toLowerCase().match(/<[a-z][a-z0-9]*>/g) ||
    [].join("");
  const tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  const comments = /<!--[\s\S]*?-->/gi;
  const nbsp = /&nbsp;/gi;
  return input
    .replace(comments, "")
    .replace(tags, ($0, $1) =>
      allowed.indexOf(`<${$1.toLowerCase()}>`) > -1 ? $0 : ""
    )
    .replace(nbsp, " ")
    .trim();
}

export function toClassName(name) {
  return typeof name === "string"
    ? name
        .toLowerCase()
        .replace(/[^a-z0-9_]/gi, "_")
        .replace(/^_+|_+$/g, "")
    : "";
}

const clear = Symbol("clear");

export const getId = (function getId() {
  let ids = {};
  return function (name, clear) {
    if (name === clear) {
      ids = {};
      return "";
    }
    const slug = toClassName(name);
    const idsSlug = ids[slug];
    const idSuffix = idsSlug ? `-${idsSlug}` : "";
    ids[slug] = idsSlug ? idsSlug + 1 : 1;
    return `${slug}${idSuffix}`;
  };
})();

export function resetIds() {
  getId(clear);
}

export function createLabel(fd, tagName = "label") {
  if (fd.label && fd.label.value) {
    const label = document.createElement(tagName);
    label.setAttribute("for", fd.id);
    label.className = "field-label";
    if (fd.label.richText === true) {
      label.innerHTML = stripTags(fd.label.value);
    } else {
      label.textContent = fd.label.value;
    }
    if (fd.label.visible === false) {
      label.dataset.visible = "false";
    }
    if (fd.tooltip) {
      label.title = stripTags(fd.tooltip, "");
    }
    return label;
  }
}

export function getHTMLRenderType(fd) {
  return fd?.fieldType?.replace("-input", "") ?? "text";
}

export function createFieldWrapper(fd, tagName = "div", labelFn = createLabel) {
  const fieldWrapper = document.createElement(tagName);
  const nameStyle = fd.name ? `field-${toClassName(fd.name)}` : "";
  const renderType = getHTMLRenderType(fd);
  const fieldId = `${renderType}${nameStyle}`;
  fieldWrapper.className = fieldId;
  fieldWrapper.dataset.id = fieldId;
  fieldWrapper.dataset.visible = fd.visible;

  if (fd.visible === false) {
    fieldWrapper.classList.add("field-wrapper");
  }
  if (labelFn && fd.label.value && typeof labelFn === "function") {
    const label = labelFn(fd);
    if (label) {
      fieldWrapper.append(label);
    }
  }
  return fieldWrapper;
}

export function createButton(fd) {
  const wrapper = createFieldWrapper(fd);
  if (fd.buttonType) {
    wrapper.classList.add(`${fd.buttonType}-wrapper`);
  }

  const button = document.createElement("button");
  button.textContent = fd?.label?.visible === false ? "" : fd?.label?.value;
  button.type = fd.type || "button";
  button.classList.add("button");
  button.classList.add(fd.name);
  button.dataset.id = fd.name;
  if (fd?.label?.visible === false) {
    button.setAttribute("aria-label", fd?.label?.value || "");
  }

  if (fd.enabled === false) {
    button.disabled = true;
    button.setAttribute("disabled", "");
  }
  wrapper.replaceChildren(button);
  return wrapper;
}

function getFieldContainer(fieldElement) {
  const wrapper = fieldElement?.closest(".field-wrapper");
  let container = wrapper;
  if (
    (fieldElement.type == "radio" || fieldElement.type == "checkbox") &&
    wrapper.dataset.fieldset
  ) {
    container = fieldElement?.closest(
      `fieldset[name=${wrapper.dataset.fieldset}]`
    );
  }
  return container;
}

export function createHelpText(fd) {
  const div = document.createElement("div");
  div.className = "field-description";
  div.setAttribute("aria-live", "polite");
  div.innerHTML = fd.description;
  div.id = `${fd.id}-description`;
  return div;
}

export function updateOrCreateInvalidMsg(fieldElement, msg) {
  const container = getFieldContainer(fieldElement);
  let element = container.querySelector(":scope .field-description");
  if (!element) {
    element = createHelpText({ id: fieldElement.id });
    container.append(element);
  }
  if (msg) {
    container.classList.add("field-invalid");
    element.textContent = msg;
  } else if (container.dataset.description) {
    container.classList.remove("field-invalid");
    element.innerHTML = container.dataset.description;
  } else if (element) {
    element.remove();
  }
  return element;
}

function removeInvalidMsg(fieldElement) {
  return updateOrCreateInvalidMsg(fieldElement, "");
}

export const validityKeyMsgMap = {
  patternMismatch: { key: "pattern", attribute: "type" },
  rangeOverflow: { key: "maximum", attribute: "max" },
  rangeUnderflow: { key: "minimum", attribute: "min" },
  tooLong: { key: "maxLength", attribute: "maxlength" },
  tooShort: { key: "minLength", attribute: "minlength" },
  valueMissing: { key: "required" },
};

export function getCheckboxGroupValue(name, htmlForm) {
  const val = [];
  htmlForm.querySelectorAll(`input[name="${name}"]`).forEach((x) => {
    if (x.checked) {
      val.push(x.value);
    }
  });
  return val;
}

function updateRequiredCheckboxGroup(name, htmlForm) {
  const checkboxGroup =
    htmlForm.querySelectorAll(`input[name="${name}"]`) || [];
  const value = getCheckboxGroupValue(name, htmlForm);
  checkboxGroup.forEach((checkbox) => {
    if (checkbox.checked || value.length) {
      checkbox.setAttribute("required", true);
    } else {
      checkbox.removeAttribute("required");
    }
  });
}

function getValidationMessage(fieldElement, wrapper) {
  const invalidProperty = Object.keys(validityKeyMsgMap).filter(
    (state) => fieldElement.validity[state]
  )[0];
  const { key, attribute } = validityKeyMsgMap[invalidProperty] || {};
  const message =
    wrapper.dataset[`${key}ErrorMessage`] ||
    (attribute
      ? defaultErrorMessages[key].replace(
          /\$0/,
          fieldElement.getAttribute(attribute)
        )
      : defaultErrorMessages[key]);
  return message || fieldElement.validationMessage;
}

export function checkValidation(fieldElement) {
  const wrapper = fieldElement.closest(".field-wrapper");
  const isCheckboxGroup = fieldElement.dataset.fieldType === "checkbox-group";
  const required = wrapper?.dataset?.required;
  if (isCheckboxGroup && required === "true") {
    updateRequiredCheckboxGroup(fieldElement.name, fieldElement.form);
  }
  if (fieldElement.validity.valid && fieldElement.type != "file") {
    removeInvalidMsg(fieldElement);
    return;
  }
  const message = getValidationMessage(fieldElement, wrapper);
  updateOrCreateInvalidMsg(fieldElement, message);
}
