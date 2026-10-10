import type { Metadata } from "next";
import { Deck } from "./deck";

export const metadata: Metadata = { title: "Priora · Pitch" };

export default function DeckPage() {
  return <Deck />;
}
