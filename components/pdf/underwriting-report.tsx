import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, colors } from "./styles";
import type { Lead, Underwriting } from "@/lib/types";

interface Props {
  lead: Lead;
  underwriting: Underwriting;
}

export function UnderwritingReport({ lead, underwriting: u }: Props) {
  const a = u.assessment;
  const f = u.inputs.financials;
  const b = u.inputs.bureau;

  const date = new Date(u.createdAt).toISOString().slice(0, 10);
  const bigUsd = (n: number) => `$${n.toLocaleString()}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.brandMark} />
            <View>
              <Text style={styles.brandName}>OCEANX AI</Text>
              <Text style={styles.brandSub}>Underwriting Report</Text>
            </View>
          </View>
          <View>
            <Text style={{ fontSize: 9, color: colors.muted, textAlign: "right" }}>
              {date}
            </Text>
            <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "right" }}>
              Ref: {u.id}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{lead.raw.company}</Text>
        <Text style={styles.subtitle}>
          {lead.enriched.industry} · {lead.enriched.hqCountry} · TTM revenue {bigUsd(f.revenue_ttm_usd)}
        </Text>

        {/* Headline metrics */}
        <View style={styles.bigStat}>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Risk score</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    a.risk_score >= 65
                      ? colors.ok
                      : a.risk_score >= 50
                        ? colors.warn
                        : colors.err,
                },
              ]}
            >
              {a.risk_score} / 100
            </Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Recommended limit</Text>
            <Text style={styles.statValue}>{bigUsd(a.recommended_credit_limit_usd)}</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Confidence</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    a.confidence === "high"
                      ? colors.ok
                      : a.confidence === "medium"
                        ? colors.warn
                        : colors.err,
                  textTransform: "capitalize",
                },
              ]}
            >
              {a.confidence}
            </Text>
          </View>
        </View>

        {/* Rationale */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Assessment</Text>
          <Text style={styles.body}>{a.rationale}</Text>
        </View>

        {/* Red flags */}
        {a.red_flags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Red flags</Text>
            {a.red_flags.map((flag, i) => (
              <View key={i} style={styles.flag}>
                <View style={styles.flagDot} />
                <Text style={{ flex: 1 }}>{flag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Financials grid */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Financial snapshot (12-mo)</Text>
          <Row k="TTM revenue" v={bigUsd(f.revenue_ttm_usd)} />
          <Row k="EBITDA margin" v={`${(f.ebitda_margin * 100).toFixed(1)}%`} />
          <Row k="Cash on hand" v={bigUsd(f.cash_on_hand_usd)} />
          <Row k="Current ratio" v={f.current_ratio.toFixed(2)} />
          <Row k="Debt / equity" v={f.debt_to_equity.toFixed(2)} />
          <Row k="Avg monthly inflow" v={bigUsd(Math.round(avg(f.monthly_inflow_usd)))} />
          <Row k="Avg monthly outflow" v={bigUsd(Math.round(avg(f.monthly_outflow_usd)))} />
        </View>

        {/* Bureau */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Credit bureau ({b.bureau})</Text>
          <Row k="Score" v={`${b.score} / 100`} />
          <Row k="Delinquencies (24m)" v={String(b.delinquencies_24m)} />
          <Row k="Bankruptcies" v={String(b.bankruptcies)} />
          <Row k="Utilization" v={`${(b.utilization * 100).toFixed(0)}%`} />
          <Row k="Trade references" v={String(b.trade_references)} />
        </View>

        {/* Inputs */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Application</Text>
          <Row k="Requested credit" v={bigUsd(u.inputs.requested_credit_usd)} />
          <Row k="Order ballpark" v={bigUsd(u.inputs.order_size_usd)} />
          <Row k="Lead source" v={lead.raw.source} />
          <Row k="ICP score" v={`${lead.score.score} / 100`} />
        </View>

        <View style={styles.footer} fixed>
          <Text>OceanX AI · Underwriting</Text>
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

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
