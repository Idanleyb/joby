import { redirect } from "next/navigation";

/** Old address of "Proposals". */
export default function OldApplications() {
  redirect("/proposals");
}
