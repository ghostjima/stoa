import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Tag } from "./Chips";
import { Button } from "./Controls";
import { Countdown } from "./Countdown";
import { DetailHeader } from "./DetailHeader";
import { focusWhenReady } from "./focus";
import { useStoaFormat } from "./locale";
import { useShortcuts } from "./Shortcuts";

const meta: Meta = { title: "Case/DetailHeader" };
export default meta;

type Case = { id: string; account: string; name: { en: string; ar: string }; subject: { en: string; ar: string } };
const CASES: Case[] = [
  { id: "Z-000104", account: "40817 810 5 0000 0012345", name: { en: "Ivanova A. P.", ar: "إيفانوفا أ. ب." }, subject: { en: "Card blocked", ar: "حظر البطاقة" } },
  { id: "Z-000107", account: "40817 810 9 0000 0067890", name: { en: "Petrov S. N.", ar: "بيتروف س. ن." }, subject: { en: "Transfer refused", ar: "رفض التحويل" } },
  { id: "Z-000112", account: "40702 810 1 0000 0004321", name: { en: "Sever LLC", ar: "شركة سيفير" }, subject: { en: "Account closed", ar: "إغلاق الحساب" } },
];

const words = {
  en: { cases: "Cases", case: "Case", account: "Account", stream: "Antifraud", stage: "Facts requested", assign: "Assign", open: (id: string) => `Open ${id}` },
  ar: { cases: "الطلبات", case: "الطلب", account: "الحساب", stream: "مكافحة الاحتيال", stage: "طلب الوقائع", assign: "إسناد", open: (id: string) => `فتح ${id}` },
};

/** The header of an open case: Back with its key, the case's title as a
 * heading, its identifiers left to right in either direction, a status
 * badge, a tag and the time left, and an action at the end. */
export const OpenCase: StoryObj = {
  render: () => {
    const lang = useStoaFormat().locale.startsWith("ar") ? "ar" : "en";
    const w = words[lang];
    const c = CASES[0]!;
    return (
      <DetailHeader
        title={`${c.subject[lang]}, ${c.name[lang]}`}
        identifiers={[
          { label: w.case, value: c.id },
          { label: w.account, value: c.account },
        ]}
        status={{ tone: "warning", label: w.stage }}
        meta={
          <>
            <Tag size="small">{w.stream}</Tag>
            <Countdown left={2} unit="workingDays" warnAt={3} announce={false} />
          </>
        }
        actions={<Button size="small">{w.assign}</Button>}
        back={{ onBack: () => undefined, focusAfter: "story-queue", shortcut: { key: "q" } }}
      />
    );
  },
};

/** A queue and the case it opens, in place of it. The case's title takes
 * the focus when it opens; Back (or Q) closes it, and the focus returns to
 * the row it was opened from, drawn again with the queue, never to the
 * page's body. */
export const BackToTheRow: StoryObj = {
  render: () => {
    const lang = useStoaFormat().locale.startsWith("ar") ? "ar" : "en";
    const w = words[lang];
    const [open, setOpen] = useState<Case | null>(null);
    const [from, setFrom] = useState<string | null>(null);
    const rowId = (c: Case) => `story-row-${c.id}`;
    const back = () => setOpen(null);
    const focusAfter = from ?? "story-queue";
    useShortcuts(
      open
        ? [
            {
              key: "q",
              description: "Back",
              onTrigger: () => {
                focusWhenReady(focusAfter);
                back();
              },
            },
          ]
        : [],
    );
    if (open)
      return (
        <section aria-labelledby="story-case-title">
          <DetailHeader
            key={open.id}
            title={`${open.subject[lang]}, ${open.name[lang]}`}
            titleId="story-case-title"
            focusOnOpen
            identifiers={[{ label: w.case, value: open.id }]}
            status={{ tone: "warning", label: w.stage }}
            back={{ onBack: back, focusAfter, shortcut: { key: "q" } }}
          />
        </section>
      );
    return (
      <section aria-labelledby="story-queue-title">
        <h2 id="story-queue-title">{w.cases}</h2>
        <ul id="story-queue" tabIndex={-1} style={{ listStyle: "none", padding: 0, display: "grid", gap: "var(--stoa-space-2)", justifyItems: "start" }}>
          {CASES.map((c) => (
            <li key={c.id}>
              <Button
                id={rowId(c)}
                variant="ghost"
                aria-label={w.open(c.id)}
                onPress={() => {
                  setFrom(rowId(c));
                  setOpen(c);
                }}
              >
                <bdi>{c.id}</bdi>&nbsp;{c.subject[lang]}
              </Button>
            </li>
          ))}
        </ul>
      </section>
    );
  },
};
