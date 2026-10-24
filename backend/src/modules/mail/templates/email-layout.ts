/**
 * Layout padrão dos emails da naPorta: tema escuro, marca em texto,
 * saudação, destaque opcional, seções e assinatura. Todo texto recebido é
 * escapado; as funções geram HTML compatível com clientes de email
 * (tabelas e estilos inline) e uma versão em texto puro equivalente.
 */

const COLORS = {
  page: '#ffffff',
  card: '#212429',
  highlightBox: '#17191c',
  // Laranja da marca naPorta.
  accent: '#EE6F16',
  name: '#F5A05C',
  heading: '#bfbfbf',
  text: '#dbdbdb',
  muted: '#8f98a0',
  value: '#f1f1f1',
  divider: '#33373d',
};

const FONT = "Arial, sans-serif, 'Motiva Sans'";

export const BRAND_NAME = 'naPorta';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface EmailHighlight {
  /** Legenda pequena acima do valor (ex.: "Senha temporária"). */
  label: string;
  /** Valor em destaque (ex.: senha ou status). */
  value: string;
}

export interface EmailButton {
  label: string;
  url: string;
}

/** Linha "rótulo: valor" (ex.: detalhes do pedido ou um item e seu preço). */
export interface EmailRow {
  label: string;
  value: string;
  /** Destaca a linha (ex.: total). */
  strong?: boolean;
}

export interface EmailSection {
  heading: string;
  /** Parágrafos; cada item vira um bloco separado. Texto puro (é escapado). */
  paragraphs?: string[];
  rows?: EmailRow[];
  button?: EmailButton;
}

export interface EmailLayoutData {
  title: string;
  /** Saudação exibida em azul no topo (ex.: "Maria,"). */
  greeting: string;
  intro: string;
  highlight?: EmailHighlight;
  sections?: EmailSection[];
}

function paragraph(text: string): string {
  return `<tr><td style="font-size:18px; line-height:25px; font-family:${FONT}; text-align:left; color:${COLORS.text}; padding-bottom:30px;">${escapeHtml(text)}</td></tr>`;
}

function highlightBlock(highlight: EmailHighlight): string {
  return `
    <tr><td style="padding-bottom:50px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="${COLORS.highlightBox}" style="background-color:${COLORS.highlightBox};">
        <tr><td class="box" style="padding:30px 56px;" align="center">
          <div style="font-size:18px; line-height:25px; font-family:${FONT}; color:${COLORS.muted}; text-align:center;">${escapeHtml(highlight.label)}:</div>
          <div style="padding-top:12px; font-size:40px; line-height:52px; font-family:${FONT}; color:${COLORS.accent}; font-weight:bold; text-align:center; word-break:break-all;">${escapeHtml(highlight.value)}</div>
        </td></tr>
      </table>
    </td></tr>`;
}

function rowsBlock(rows: EmailRow[]): string {
  const cells = rows
    .map((row) => {
      const weight = row.strong ? 'bold' : 'normal';
      return `
        <tr>
          <td style="font-size:16px; line-height:22px; font-family:${FONT}; color:${COLORS.muted}; padding:10px 16px 10px 0; border-bottom:1px solid ${COLORS.divider}; font-weight:${weight};">${escapeHtml(row.label)}</td>
          <td align="right" style="font-size:16px; line-height:22px; font-family:${FONT}; color:${COLORS.value}; padding:10px 0; border-bottom:1px solid ${COLORS.divider}; font-weight:${weight}; text-align:right;">${escapeHtml(row.value)}</td>
        </tr>`;
    })
    .join('');
  return `
    <tr><td style="padding-bottom:30px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0">${cells}</table>
    </td></tr>`;
}

function buttonBlock(button: EmailButton): string {
  return `
    <tr><td style="padding-bottom:30px;">
      <a href="${escapeHtml(button.url)}" target="_blank" style="display:inline-block; background-color:${COLORS.accent}; color:#ffffff; font-family:${FONT}; font-size:18px; font-weight:bold; text-decoration:none; padding:14px 32px; border-radius:2px;">${escapeHtml(button.label)}</a>
    </td></tr>`;
}

function sectionBlock(section: EmailSection): string {
  return `
    <tr><td style="font-size:30px; line-height:34px; font-family:${FONT}; text-align:left; padding:20px 0; color:${COLORS.heading}; font-weight:bold;">${escapeHtml(section.heading)}</td></tr>
    ${(section.paragraphs ?? []).map(paragraph).join('')}
    ${section.rows?.length ? rowsBlock(section.rows) : ''}
    ${section.button ? buttonBlock(section.button) : ''}`;
}

/** HTML completo do email. */
export function renderEmailLayout(data: EmailLayoutData): string {
  return `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta http-equiv="Content-type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>${escapeHtml(data.title)}</title>
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .shell { width: 92% !important; }
      .card { padding: 32px 20px !important; }
      .box { padding: 24px 16px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${COLORS.page}; -webkit-text-size-adjust:none;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="${COLORS.page}" style="background-color:${COLORS.page};">
    <tr><td align="center" valign="top">
      <table class="shell" width="75%" border="0" cellspacing="0" cellpadding="0" style="width:75%; max-width:775px; border-collapse:separate; margin:32px 0;">
        <tr><td class="card" bgcolor="${COLORS.card}" style="background-color:${COLORS.card}; padding:60px 80px; border-radius:12px;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr><td style="font-size:32px; line-height:38px; font-family:${FONT}; text-align:left; padding-bottom:30px; color:${COLORS.accent}; font-weight:bold; letter-spacing:-0.5px;">${BRAND_NAME}</td></tr>
            <tr><td style="font-size:36px; line-height:42px; font-family:${FONT}; text-align:left; padding-bottom:30px; color:${COLORS.name}; font-weight:bold;">${escapeHtml(data.greeting)}</td></tr>
            ${paragraph(data.intro)}
            ${data.highlight ? highlightBlock(data.highlight) : ''}
            ${(data.sections ?? []).map(sectionBlock).join('')}
            <tr><td style="padding-top:30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="3" bgcolor="${COLORS.accent}" style="background-color:${COLORS.accent}; font-size:0; line-height:0;"></td>
                  <td width="37" style="font-size:0; line-height:0;"></td>
                  <td style="font-size:16px; line-height:22px; font-family:${FONT}; text-align:left; padding:20px 0; color:${COLORS.value};">Atenciosamente,<br />A equipe ${BRAND_NAME}</td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Versão em texto puro do mesmo conteúdo (alternativa ao HTML). */
export function renderEmailText(data: EmailLayoutData): string {
  const lines: string[] = [data.greeting, '', data.intro, ''];
  if (data.highlight) {
    lines.push(`${data.highlight.label}: ${data.highlight.value}`, '');
  }
  for (const section of data.sections ?? []) {
    lines.push(section.heading.toUpperCase(), '');
    for (const text of section.paragraphs ?? []) {
      lines.push(text, '');
    }
    if (section.rows?.length) {
      lines.push(
        ...section.rows.map((row) => `${row.label}: ${row.value}`),
        '',
      );
    }
    if (section.button) {
      lines.push(`${section.button.label}: ${section.button.url}`, '');
    }
  }
  lines.push('Atenciosamente,', `A equipe ${BRAND_NAME}`);
  return lines.join('\n');
}
