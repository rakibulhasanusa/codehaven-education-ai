# MCQ AI System

এই প্রজেক্টে admin (`/admin`) থেকে Excel/CSV আপলোড করে MCQ ব্যাংক তৈরি করা যায়, আর client (`/bcs`) থেকে subject-wise নতুন MCQ generate করা যায়।

## Excel/CSV ফাইল ফরম্যাট

আপনি `.csv`, `.xlsx`, `.xls` আপলোড করতে পারবেন।

### Required Columns (exact name)

1. `subject`
2. `question`
3. `optionA`
4. `optionB`
5. `optionC`
6. `optionD`
7. `answer`

### Optional Columns

1. `explanation`
2. `difficulty`
3. `topic`

## `answer` field rule

`answer` শুধু এই চারটা ভ্যালু হবে:

- `A`
- `B`
- `C`
- `D`

Small letter (`a/b/c/d`) দিলে system auto-uppercase করে নেয়।

## Example CSV

```csv
subject,question,optionA,optionB,optionC,optionD,answer,explanation,difficulty,topic
Bangladesh Affairs,Who wrote 'Amar Dekha Naya Chin'?,Sheikh Mujibur Rahman,Kazi Nazrul Islam,Rabindranath Tagore,Begum Rokeya,A,It was written by Sheikh Mujib,Medium,History
General Science,Which gas is highest in atmosphere?,Oxygen,Nitrogen,Carbon Dioxide,Hydrogen,B,Nitrogen is about 78%,Basic,Chemistry
```

## Excel sheet structure

- প্রথম row = header row (column names)
- পরের rowগুলো = question data
- এক sheet হলেও যথেষ্ট (system first sheet parse করে)

## Important Upload Notes

1. Header name ভুল হলে row validation fail করবে
2. `question` empty হলে reject হবে
3. `optionA-D` এর যেকোনোটা empty হলে reject হবে
4. `answer` invalid হলে reject হবে
5. `subject` না থাকলে reject হবে

## কোথায় sample template আছে

Sample template:

- `public/templates/mcq-upload-template.csv`

আপনি এটা download করে একই structure follow করতে পারবেন।

## Upload এর পর কী হয়

1. File parse হয় (`csv/xlsx`)
2. প্রতিটি row validate হয়
3. Subject না থাকলে auto-create হয়
4. Questions Supabase Postgres-এ save হয়
5. শুধুমাত্র admin-uploaded প্রশ্নের জন্য embedding generate হয়
6. Pinecone-এ vector store হয় এবং `embeddingId` DB-তে save হয়

## Generated MCQ সম্পর্কে

- `/bcs` থেকে AI-generated MCQ save করা হলে সেটা DB-তে save হয়
- AI-generated MCQ এর জন্য embedding/vector store করা হয় না

## Setup (quick)

1. Dependencies install:

```bash
pnpm install
```

2. Env file setup:

- `.env.example` দেখে `.env` configure করুন

3. Run app:

```bash
pnpm dev
```

4. Open routes:

- Admin: `http://localhost:3000/admin`
- Client: `http://localhost:3000/bcs`
