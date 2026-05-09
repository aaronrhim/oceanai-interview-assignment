import { beat } from "@/agents/runner";
import { makeId } from "@/lib/ids";

export interface DocusignEnvelope {
  envelope_id: string;
  status: "sent";
  signing_url: string;
  signers: { name: string; email: string }[];
}

export async function sendEnvelope(input: {
  document_url: string;
  signers: { name: string; email: string }[];
}): Promise<DocusignEnvelope> {
  await beat(540);
  const env_id = makeId("env").replace("_", "-");
  return {
    envelope_id: env_id,
    status: "sent",
    signing_url: `https://demo.docusign.net/Signing/MTRedeem/v1/${env_id}`,
    signers: input.signers,
  };
}
