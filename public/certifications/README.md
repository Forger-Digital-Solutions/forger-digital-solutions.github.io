# Certifications

Place certification PDF files here to make them publicly available at:

```
https://forger-digital-solutions.github.io/certifications/[filename].pdf
```

## Adding a Certification

1. Copy the public PDF file into this directory:
   ```
   public/certifications/
   ```

2. Add its metadata to `src/data/certifications.ts`

3. Test locally with `npm run dev`

4. Commit and push to trigger GitHub Pages deployment

## Security Warning

**Anything committed inside `public/certifications/` becomes publicly accessible.**
Never place private or sensitive certification documents here.

## Example

After adding `example-certification.pdf` to this folder and updating the data file,
it will be accessible at:
```
https://forger-digital-solutions.github.io/certifications/example-certification.pdf
```