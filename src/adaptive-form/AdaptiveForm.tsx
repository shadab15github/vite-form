import { mappings } from "@aemforms/af-react-components";
import { AdaptiveForm } from "@aemforms/af-react-renderer";
import {
  Provider as SpectrumProvider,
  defaultTheme,
} from "@adobe/react-spectrum";
import { FormJson } from "@aemforms/af-core";
import { BlockProps } from "../../types";
import { Heading, PageBoundary, Section } from "@suncorp/design-system";
import { useEffect, useRef } from "react";

export interface AdaptiveFormProps extends BlockProps {
  formJson: string;
}

const AdaptiveFormBlock: React.FC<AdaptiveFormProps> = ({
  title,
  formJson,
}) => {
  const formEl = useRef<HTMLFormElement | null>(null);
  const containerEl = useRef<HTMLDivElement | null>(null);
  const parsed: FormJson = JSON.parse(JSON.parse(formJson));
  useEffect(() => {
    if (!containerEl.current) return;

    const observer = new MutationObserver(() => {
      const form = containerEl.current?.querySelector("form");
      if (form) {
        form.dataset.formpath = parsed.properties?.["fd:path"];
        observer.disconnect();
      }
    });

    observer.observe(containerEl.current, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [parsed]);

  console.log(parsed);

  return (
    <div ref={containerEl}>
      <style>
        {`
          form {
            display: flex;
            flex-direction: column;
            gap: 32px;
          }
        `}
      </style>
      <Section>
        <PageBoundary style={{ width: "narrow" }}>
          <Heading style={{ rank: "h1" }}>{title}</Heading>
          <SpectrumProvider theme={defaultTheme}>
            <AdaptiveForm
              ref={formEl}
              formJson={parsed}
              mappings={{
                ...mappings,
              }}
            />
          </SpectrumProvider>
        </PageBoundary>
      </Section>
    </div>
  );
};

export default AdaptiveFormBlock;
