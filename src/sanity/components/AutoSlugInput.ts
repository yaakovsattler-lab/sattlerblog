"use client";

/*
 * The address field fills itself from the title while the post has never
 * been published, so the editor never has to press "Generate" or think about
 * URLs. Once the post is published the address stops following the title -
 * changing it then would break every link already shared in the group.
 */
import { useEffect } from "react";
import { set, useEditState, useFormValue, type SlugInputProps } from "sanity";
import { slugify } from "../slugify";

export function AutoSlugInput(props: SlugInputProps) {
  const { onChange, value, renderDefault } = props;
  const title = useFormValue(["title"]) as string | undefined;
  const id = (useFormValue(["_id"]) as string | undefined)?.replace(/^drafts\./, "") ?? "";
  const type = (useFormValue(["_type"]) as string | undefined) ?? "";
  const { published, ready } = useEditState(id, type);

  useEffect(() => {
    if (!ready || published || !title) return;
    const next = slugify(title);
    if (next && next !== value?.current) onChange(set({ _type: "slug", current: next }));
  }, [ready, published, title, value, onChange]);

  return renderDefault(props);
}
