import { analyseFile } from '../../src/analyser';

/**
 * Regression tests for patterns that a real React codebase is full of.
 *
 * Measured against a 1,497-file production component library, the rules
 * produced 172 findings and every one was a false positive. Each case below is
 * taken from that run. A linter that cries wolf on idiomatic code does not get
 * merged, so these are as load-bearing as the detection tests.
 */
function violationsFor(source: string, ruleId: string) {
  return analyseFile(source, 'test.tsx').violations.filter(v => v.ruleId === ruleId);
}

describe('aria-correctness false positives', () => {
  it('accepts a bare boolean attribute (JSX shorthand for {true})', () => {
    // <span aria-hidden /> compiles to aria-hidden={true} and React serialises
    // it to aria-hidden="true". Valid markup, previously flagged.
    const source = `export const C = () => <span aria-hidden><Icon /></span>;`;
    expect(violationsFor(source, 'aria-correctness')).toHaveLength(0);
  });

  it('ignores dynamic expression values', () => {
    const source = `export const C = () => <div aria-expanded={isOpen}>x</div>;`;
    expect(violationsFor(source, 'aria-correctness')).toHaveLength(0);
  });

  it('accepts the tristate value "mixed" on aria-checked', () => {
    const source = `export const C = () => <div aria-checked="mixed">x</div>;`;
    expect(violationsFor(source, 'aria-correctness')).toHaveLength(0);
  });

  it('accepts the token values of aria-invalid', () => {
    const source = `export const C = () => <input aria-label="x" aria-invalid="spelling" />;`;
    expect(violationsFor(source, 'aria-correctness')).toHaveLength(0);
  });

  it('still rejects a genuinely invalid literal', () => {
    const source = `export const C = () => <div aria-expanded="yes">x</div>;`;
    expect(violationsFor(source, 'aria-correctness')).toHaveLength(1);
  });
});

describe('landmark-structure false positives', () => {
  it('ignores a landmark word inside a utility class', () => {
    const source = `export const C = () => <div className="text-sidebar-foreground md:block">x</div>;`;
    expect(violationsFor(source, 'landmark-structure')).toHaveLength(0);
  });

  it('ignores a landmark word inside an arbitrary-value class', () => {
    const source = `export const C = () => <div className="[--header-height:calc(4px)]">x</div>;`;
    expect(violationsFor(source, 'landmark-structure')).toHaveLength(0);
  });

  it('ignores a landmark word inside a container name', () => {
    const source = `export const C = () => <div className="@container/main flex flex-1">x</div>;`;
    expect(violationsFor(source, 'landmark-structure')).toHaveLength(0);
  });

  it('ignores a hyphenated descendant class', () => {
    const source = `export const C = () => <div className="nav-item">x</div>;`;
    expect(violationsFor(source, 'landmark-structure')).toHaveLength(0);
  });

  it('respects an explicit role', () => {
    const source = `export const C = () => <div className="sidebar" role="complementary">x</div>;`;
    expect(violationsFor(source, 'landmark-structure')).toHaveLength(0);
  });

  it('still flags a whole-token landmark class', () => {
    const source = `export const C = () => <div className="flex sidebar gap-2">x</div>;`;
    expect(violationsFor(source, 'landmark-structure')).toHaveLength(1);
  });
});

describe('form-semantics false positives', () => {
  it('ignores a control that forwards props', () => {
    // The consumer of a design-system input supplies the label.
    const source = `export const Input = (props) => <input type="text" {...props} />;`;
    expect(violationsFor(source, 'form-semantics')).toHaveLength(0);
  });

  it('ignores a hidden input', () => {
    const source = `export const C = () => <input type="hidden" value="1" />;`;
    expect(violationsFor(source, 'form-semantics')).toHaveLength(0);
  });

  it('ignores a submit input, which is named by its value', () => {
    const source = `export const C = () => <input type="submit" value="Save" />;`;
    expect(violationsFor(source, 'form-semantics')).toHaveLength(0);
  });

  it('ignores a dynamic id, whose association cannot be checked', () => {
    const source = `export const C = ({ id }) => <input type="text" id={id} />;`;
    expect(violationsFor(source, 'form-semantics')).toHaveLength(0);
  });

  it('accepts an implicit label wrapper', () => {
    const source = `export const C = () => <label>Email<input type="text" /></label>;`;
    expect(violationsFor(source, 'form-semantics')).toHaveLength(0);
  });

  it('still flags a bare unlabelled input', () => {
    const source = `export const C = () => <input type="text" />;`;
    expect(violationsFor(source, 'form-semantics')).toHaveLength(1);
  });
});

describe('interactive-semantics false positives', () => {
  it('ignores a button whose label is an expression nested in a span', () => {
    const source = `
      export const C = () => (
        <button onClick={fn}>
          <span className="text-xs">{config.label}</span>
        </button>
      );
    `;
    expect(violationsFor(source, 'interactive-semantics')).toHaveLength(0);
  });

  it('ignores a button with text nested several levels deep', () => {
    const source = `
      export const C = () => (
        <button onClick={fn}>
          <Icon />
          <Content><div>Marker as a button</div></Content>
        </button>
      );
    `;
    expect(violationsFor(source, 'interactive-semantics')).toHaveLength(0);
  });

  it('ignores a button that forwards props', () => {
    const source = `export const B = (props) => <button {...props}><Icon /></button>;`;
    expect(violationsFor(source, 'interactive-semantics')).toHaveLength(0);
  });

  it('ignores an img that forwards props', () => {
    const source = `export const I = (props) => <img src="/a.png" {...props} />;`;
    expect(violationsFor(source, 'interactive-semantics')).toHaveLength(0);
  });

  it('still flags a genuinely icon-only button', () => {
    const source = `export const C = () => <button onClick={fn}><TrashIcon /></button>;`;
    expect(violationsFor(source, 'interactive-semantics')).toHaveLength(1);
  });
});

describe('document-structure false positives', () => {
  it('ignores focus listeners on a container', () => {
    // A div with onBlur is observing focus, not acting as a control.
    const source = `export const C = () => <div onBlur={fn} onFocus={fn}>x</div>;`;
    expect(violationsFor(source, 'document-structure')).toHaveLength(0);
  });

  it('ignores a container that forwards props, which may carry the role', () => {
    const source = `export const C = (props) => <div onClick={fn} {...props}>x</div>;`;
    expect(violationsFor(source, 'document-structure')).toHaveLength(0);
  });

  it('ignores a handler that only stops propagation', () => {
    // Modal inner panels guard against the backdrop's close handler. This
    // affords the user nothing, so demanding a role for it is noise.
    const source = `export const C = () => <div onClick={(e) => e.stopPropagation()}>x</div>;`;
    expect(violationsFor(source, 'document-structure')).toHaveLength(0);
  });

  it('ignores a block-bodied handler that only calls preventDefault', () => {
    const source = `
      export const C = () => (
        <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>x</div>
      );
    `;
    expect(violationsFor(source, 'document-structure')).toHaveLength(0);
  });

  it('still flags a handler that stops propagation and then acts', () => {
    const source = `
      export const C = () => (
        <div onClick={(e) => { e.stopPropagation(); open(); }}>x</div>
      );
    `;
    expect(violationsFor(source, 'document-structure')).toHaveLength(1);
  });

  it('ignores a contentEditable element, which is already focusable', () => {
    const source = `export const C = () => <span contentEditable={isEditing} onClick={fn}>x</span>;`;
    expect(violationsFor(source, 'document-structure')).toHaveLength(0);
  });

  it('still flags contentEditable={false}, which is not editable', () => {
    const source = `export const C = () => <span contentEditable={false} onClick={fn}>x</span>;`;
    expect(violationsFor(source, 'document-structure')).toHaveLength(1);
  });

  it('ignores an event-delegation handler that inspects event.target', () => {
    // Canvases and preview panes listen for clicks bubbling out of their
    // subtree. The container is a listening surface, not a control.
    const source = `
      export const C = () => (
        <div onClick={(e) => {
          const el = e.target as Element;
          if (!el.hasAttribute("data-item")) clearSelection();
        }}>x</div>
      );
    `;
    expect(violationsFor(source, 'document-structure')).toHaveLength(0);
  });

  it('still flags a handler that reads currentTarget, which is this element', () => {
    const source = `
      export const C = () => (
        <div onClick={(e) => { activate(e.currentTarget); }}>x</div>
      );
    `;
    expect(violationsFor(source, 'document-structure')).toHaveLength(1);
  });

  it('still flags a click handler on a plain div', () => {
    const source = `export const C = () => <div onClick={fn}>Save</div>;`;
    expect(violationsFor(source, 'document-structure')).toHaveLength(1);
  });
});
