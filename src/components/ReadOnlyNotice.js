import ComingSoon from '@/components/ComingSoon';

// Shown instead of a form when the trip is closed or you're not a member.
export default function ReadOnlyNotice({
  message = 'This trip is closed, so expenses can’t be changed.',
}) {
  return <ComingSoon icon="lock-outline" title="Read only" message={message} />;
}
