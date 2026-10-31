import { defaultRule, type RepeatRule } from "@/lib/recurrence";

export type SessionFormValues = {
  id?: string;
  kind: "GROUP" | "CAMP" | "PRIVATE";
  program: string;
  typeId: string;
  title: string;
  coach: string;
  coaches: string[];
  location: string;
  date: string;
  start: string;
  end: string;
  capacity: string;
  price: string;
  description: string;
  rule: RepeatRule;
  repeating: boolean;
};

export function blankSessionValues(today: string, roster: string[], location: string): SessionFormValues {
  return {
    kind: "GROUP",
    program: "Quarterback Training",
    typeId: "",
    title: "",
    coach: "",
    coaches: roster,
    location,
    date: today,
    start: "17:00",
    end: "18:00",
    capacity: "8",
    price: "",
    description: "",
    rule: defaultRule(today),
    repeating: false,
  };
}
