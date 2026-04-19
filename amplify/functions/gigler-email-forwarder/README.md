# gigler-email-forwarder

A standalone AWS Lambda function that forwards all inbound email sent to `*@gigler.ai` to `forwarding-target@example.com`.

## Why is this Lambda NOT in Amplify?

This Lambda is deployed **manually** to `us-east-2`, **not** via Amplify Gen 2. Reasons:

- **SES inbound is region-locked**: SES inbound, the S3 bucket it writes to, and the Lambda it invokes must all be in the same AWS region.
- **The rest of the Gigler Amplify stack lives in `us-east-1`**: us-east-1 is in SES sandbox mode in this account; us-east-2 has production access.
- **Isolation from Amplify lifecycle**: keeping this Lambda outside Amplify means routine `git push` deploys never disturb it.

## Architecture

```
Sender (anyone@anywhere)
  -> gigler.ai MX record -> SES us-east-2 inbound
  -> S3 PutObject in gigler-inbound-emails/emails/
  -> Invokes this Lambda
  -> SES SendRawEmail from notifications@gigler.ai
  -> forwarding-target@example.com (Gmail)
```

## Forwarding behavior

- All addresses at `@gigler.ai` (admin@, support@, hello@, gig@, foo+bar@, anything) forward to `forwarding-target@example.com`.
- The original `From` is preserved as a `Reply-To` header, so replying from Gmail goes back to the actual sender.
- The `From` header is rewritten to `Original Name <notifications@gigler.ai>` (required because SES will only send from verified domains).
- Subject is preserved as-is (no prefix).

## AWS resources (all in us-east-2)

- **S3 bucket**: `gigler-inbound-emails`
- **IAM role**: `gigler-email-forwarder-role`
- **Lambda**: `gigler-email-forwarder` (Node.js 22.x, 256MB, 30s timeout)
- **SES domain identity**: `gigler.ai` (verified + DKIM)
- **SES email identity**: `notifications@gigler.ai`
- **SES receipt rule set**: `gigler-inbound`
- **SES receipt rule**: `gigler-forward-all`

## DNS (Route 53 hosted zone Z07972423KVFXPN1BA99T)

- MX: `gigler.ai` -> `10 inbound-smtp.us-east-2.amazonaws.com`
- TXT: `_amazonses.gigler.ai` (SES domain verification token)
- 3x CNAME: `<token>._domainkey.gigler.ai` -> `<token>.dkim.amazonses.com` (DKIM)
- TXT: `gigler.ai` -> `v=spf1 include:amazonses.com ~all` (SPF)

## Deploying / updating this Lambda

```sh
./scripts/deploy-email-forwarder.sh
```

The script bundles `index.js` + `node_modules/` into a zip and uploads it via `aws lambda update-function-code` (or creates the function on first run).

## Adding new destination addresses

Edit `index.js` -> `forwardMapping`, then redeploy. For example, to also send a copy to `alerts@example.com`:

```js
forwardMapping: {
  "@gigler.ai": ["forwarding-target@example.com", "alerts@example.com"],
}
```

To route specific addresses to specific people:

```js
forwardMapping: {
  "admin@gigler.ai": ["forwarding-target@example.com"],
  "billing@gigler.ai": ["finance@example.com"],
  "@gigler.ai": ["forwarding-target@example.com"],
}
```

(The `@gigler.ai` catch-all only matches addresses NOT explicitly listed above it.)

## Reference

- npm package: <https://www.npmjs.com/package/aws-lambda-ses-forwarder>
- Source: <https://github.com/arithmetric/aws-lambda-ses-forwarder>
