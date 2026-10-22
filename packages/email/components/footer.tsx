import { getAppUrl } from "@business-operations/utils/envs";
import { Section, Text, Link } from "@react-email/components";
export function Footer() { return <Section><Text>Business Operations</Text><Link href={`${getAppUrl()}/settings/notifications`}>Notification settings</Link></Section>; }
