import ContactForm from "@/components/ContactForm";

export const metadata = { title: "צרו קשר" };

/*
 * The navbar CTA opens a modal, but this route stays and shows the same form,
 * so the link works with JavaScript off and so a direct link to /contact is
 * not a dead end. NO DESIGN in Figma for this page - the layout is the plain
 * page shell with the form in it, and it is flagged as invented.
 */
export default function Page() {
  return (
    <main className="plain">
      <div className="plain__inner plain__inner--form">
        <h1 className="plain__title">צרו קשר</h1>
        <ContactForm />
      </div>
    </main>
  );
}
