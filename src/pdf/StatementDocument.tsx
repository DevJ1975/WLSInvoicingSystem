import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { StatementData } from '../lib/statement';

const RED = '#E2231A';
const INK = '#2E2224';
const MUTED = '#6B7280';
const LINE = '#D8DCE0';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: INK, fontFamily: 'Helvetica' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo: { width: 150 },
  tagline: { fontSize: 8, color: MUTED, fontStyle: 'italic', marginTop: 4 },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: INK, textAlign: 'right' },
  hr: { borderBottomWidth: 2, borderBottomColor: RED, marginVertical: 12 },
  twoCol: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  block: { maxWidth: '55%' },
  metaBlock: { maxWidth: '40%' },
  name: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  muted: { color: MUTED, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  metaLabel: { color: MUTED, fontFamily: 'Helvetica-Bold', fontSize: 8 },
  metaValue: { fontFamily: 'Helvetica-Bold' },
  jobLine: { marginBottom: 10, fontSize: 9, color: INK },
  table: { borderWidth: 1, borderColor: LINE, borderRadius: 2 },
  th: {
    flexDirection: 'row',
    backgroundColor: INK,
    color: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tr: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cDesc: { flex: 4 },
  cNum: { flex: 1.4, textAlign: 'right' },
  thText: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#fff' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: INK,
  },
  totalLabel: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginRight: 16 },
  totalValue: { fontFamily: 'Helvetica-Bold', fontSize: 14, color: RED },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginTop: 22, marginBottom: 6 },
  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, fontSize: 8, color: MUTED },
});

function money(n: number): string {
  return `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function date(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}/${y}`;
}

export function StatementDocument({ data, logoSrc }: { data: StatementData; logoSrc: string }) {
  const { profile } = data;
  return (
    <Document title={`WLS Expense Statement #${data.reportNo}`} author={profile.fullName}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoSrc} style={styles.logo} />
            {profile.tagline ? <Text style={styles.tagline}>{profile.tagline}</Text> : null}
          </View>
          <Text style={styles.title}>Expense Statement</Text>
        </View>
        <View style={styles.hr} />

        <View style={styles.twoCol}>
          <View style={styles.block}>
            {profile.fullName ? <Text style={styles.name}>{profile.fullName}</Text> : null}
            {profile.addressLine ? <Text style={styles.muted}>{profile.addressLine}</Text> : null}
            {profile.stationId ? <Text style={styles.muted}>{profile.stationId}</Text> : null}
            {profile.phone ? <Text style={styles.muted}>{profile.phone}</Text> : null}
            {profile.email ? <Text style={styles.muted}>{profile.email}</Text> : null}
          </View>
          <View style={styles.metaBlock}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>EXP. REPORT NO.</Text>
              <Text style={styles.metaValue}>{data.reportNo}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>DATE</Text>
              <Text style={styles.metaValue}>{date(data.reportDate)}</Text>
            </View>
            {profile.stationId ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>EMPLOYEE ID</Text>
                <Text style={styles.metaValue}>{profile.stationId}</Text>
              </View>
            ) : null}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>PERIOD</Text>
              <Text style={styles.metaValue}>{data.periodLabel}</Text>
            </View>
          </View>
        </View>

        {data.laborDescription ? <Text style={styles.jobLine}>{data.laborDescription}</Text> : null}

        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={[styles.cDesc, styles.thText]}>DESCRIPTION</Text>
            <Text style={[styles.cNum, styles.thText]}># DAYS</Text>
            <Text style={[styles.cNum, styles.thText]}>RATE</Text>
            <Text style={[styles.cNum, styles.thText]}>TOTAL</Text>
          </View>
          <View style={styles.tr}>
            <Text style={styles.cDesc}>
              {data.clientName
                ? `Onsite labor — ${data.clientName}${data.clientSite ? `, ${data.clientSite}` : ''}`
                : 'Onsite labor'}
            </Text>
            <Text style={styles.cNum}>{data.laborDays}</Text>
            <Text style={styles.cNum}>{money(data.dayRate)}</Text>
            <Text style={styles.cNum}>{money(data.laborTotal)}</Text>
          </View>
          <View style={styles.tr}>
            <Text style={styles.cDesc}>Expenses (receipts — hotel, meals, etc.)</Text>
            <Text style={styles.cNum} />
            <Text style={styles.cNum} />
            <Text style={styles.cNum}>{money(data.receiptsTotal)}</Text>
          </View>
          <View style={styles.tr}>
            <Text style={styles.cDesc}>
              Mileage ({data.mileageMiles.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi
              {data.mileageRate ? ` × $${data.mileageRate}/mi` : ''})
            </Text>
            <Text style={styles.cNum} />
            <Text style={styles.cNum} />
            <Text style={styles.cNum}>{money(data.mileageTotal)}</Text>
          </View>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL DUE</Text>
          <Text style={styles.totalValue}>{money(data.totalDue)}</Text>
        </View>

        {data.receipts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Itemized Expenses</Text>
            <View style={styles.table}>
              <View style={styles.th}>
                <Text style={[styles.cDesc, styles.thText]}>DATE / VENDOR</Text>
                <Text style={[styles.cDesc, styles.thText]}>CATEGORY</Text>
                <Text style={[styles.cNum, styles.thText]}>AMOUNT</Text>
              </View>
              {data.receipts.map((r, i) => (
                <View style={styles.tr} key={i}>
                  <Text style={styles.cDesc}>
                    {date(r.date)} {r.vendor}
                  </Text>
                  <Text style={styles.cDesc}>{r.category}</Text>
                  <Text style={styles.cNum}>{money(r.amount)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {data.trips.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Mileage Detail</Text>
            <View style={styles.table}>
              <View style={styles.th}>
                <Text style={[styles.cDesc, styles.thText]}>DATE</Text>
                <Text style={[styles.cDesc, styles.thText]}>ROUTE</Text>
                <Text style={[styles.cNum, styles.thText]}>MILES</Text>
                <Text style={[styles.cNum, styles.thText]}>TOTAL</Text>
              </View>
              {data.trips.map((t, i) => (
                <View style={styles.tr} key={i}>
                  <Text style={styles.cDesc}>{date(t.date)}</Text>
                  <Text style={styles.cDesc}>
                    {t.from} → {t.to}
                  </Text>
                  <Text style={styles.cNum}>
                    {t.miles.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </Text>
                  <Text style={styles.cNum}>{money(t.total)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {data.notes ? (
          <>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ color: MUTED }}>{data.notes}</Text>
          </>
        ) : null}

        {profile.remitTo ? (
          <Text style={styles.footer} fixed>
            {profile.remitTo}
          </Text>
        ) : null}
      </Page>
    </Document>
  );
}
