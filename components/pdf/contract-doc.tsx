import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, colors } from "./styles";
import type { Contract, Lead } from "@/lib/types";

interface Props {
  lead: Lead;
  contract: Contract;
}

export function ContractDoc({ lead, contract: c }: Props) {
  const t = c.terms;
  const date = new Date(c.createdAt).toISOString().slice(0, 10);
  const bigUsd = (n: number) => `$${n.toLocaleString()}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.brandMark} />
            <View>
              <Text style={styles.brandName}>OCEANX AI</Text>
              <Text style={styles.brandSub}>Trade Finance Agreement</Text>
            </View>
          </View>
          <View>
            <Text style={{ fontSize: 9, color: colors.muted, textAlign: "right" }}>
              {date}
            </Text>
            <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "right" }}>
              Ref: {c.id}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>Trade Finance Agreement</Text>
        <Text style={styles.subtitle}>
          {t.parties.customer} · {t.parties.supplier} · {bigUsd(t.total_value_usd)}
        </Text>

        {/* Parties */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Parties</Text>
          <Row k="Customer (Buyer)" v={t.parties.customer} />
          <Row k="Supplier" v={t.parties.supplier} />
          <Row k="Financier" v="OceanX AI, Inc. (NY) / Valkin Limited (UK)" />
        </View>

        {/* Goods + commercials */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Commercials</Text>
          <Row k="Goods" v={t.goods} />
          <Row k="Total deal value" v={bigUsd(t.total_value_usd)} />
          <Row k="Margin" v={`${t.margin_pct.toFixed(1)}%`} />
          <Row k="INCOTERMS" v={t.delivery.incoterms} />
          <Row k="ETA" v={`${t.delivery.eta_days} days from upfront`} />
        </View>

        {/* Payment structure */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Payment structure</Text>
          <Row k="Upfront" v={`${t.payment.upfront_pct}% (${bigUsd(Math.round((t.total_value_usd * t.payment.upfront_pct) / 100))})`} />
          <Row k="On delivery" v={`${t.payment.on_delivery_pct}% (${bigUsd(Math.round((t.total_value_usd * t.payment.on_delivery_pct) / 100))})`} />
          <Row
            k="Installments"
            v={
              t.payment.weekly_installments_pct > 0
                ? `${t.payment.weekly_installments_pct}% over ${t.payment.weeks} weeks`
                : "—"
            }
          />
        </View>

        {/* Jurisdiction + default */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Legal</Text>
          <Row k="Jurisdiction" v={t.jurisdiction} />
          <View style={[styles.row, { paddingVertical: 8, alignItems: "flex-start" }]}>
            <Text style={[styles.rowKey, { width: 100, paddingTop: 1 }]}>Default</Text>
            <Text style={{ flex: 1, lineHeight: 1.4 }}>{t.default_clause}</Text>
          </View>
        </View>

        {/* Signatories */}
        <View style={[styles.section, { marginTop: 28 }]}>
          <Text style={styles.sectionLabel}>Signatories</Text>
          <View style={{ flexDirection: "row", gap: 24, marginTop: 8 }}>
            {t.signatories.slice(0, 2).map((s, i) => (
              <View key={i} style={{ flex: 1 }}>
                <View
                  style={{
                    height: 36,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.line,
                  }}
                />
                <Text style={{ marginTop: 4, fontFamily: "Helvetica-Bold" }}>
                  {s.name}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 9 }}>{s.role}</Text>
                <Text style={{ color: colors.muted, fontSize: 9 }}>{s.email}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>OceanX AI · Trade Finance Agreement</Text>
          <Text>
            {lead.raw.company} · {date}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowKey}>{k}</Text>
      <Text style={styles.rowValue}>{v}</Text>
    </View>
  );
}
