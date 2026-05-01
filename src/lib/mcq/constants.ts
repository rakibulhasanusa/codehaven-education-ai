import type { BcsSubject, Subject } from "./types";

export const BCS_SUBJECTS: BcsSubject[] = [
  {
    name: "বাংলা ভাষা ও সাহিত্য",
    value: "Bengali Language and Literature",
    username: "bengali_language_and_literature",
  },
  {
    name: "English Language and Literature",
    value: "English Language and Literature",
    username: "english_language_and_literature",
  },
  {
    name: "বাংলাদেশ বিষয়াবলি",
    value: "Bangladesh Studies",
    username: "bangladesh_studies",
  },
  {
    name: "আন্তর্জাতিক বিষয়াবলি",
    value: "International Studies",
    username: "international_studies",
  },
  {
    name: "ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা",
    value: "Geography, Environment and Disaster Management",
    username: "geography_environment_and_disaster_management",
  },
  {
    name: "সাধারণ বিজ্ঞান",
    value: "General Science",
    username: "general_science",
  },
  {
    name: "কম্পিউটার ও তথ্য প্রযুক্তি",
    value: "Computer Science",
    username: "computer_science",
  },
  {
    name: "গাণিতিক যুক্তি",
    value: "Mathematical Reasoning",
    username: "mathematical_reasoning",
  },
  {
    name: "মানসিক দক্ষতা",
    value: "Mental Ability",
    username: "mental_ability",
  },
  {
    name: "নৈতিকতা, মূল্যবোধ ও সুশাসন",
    value: "Ethics, Values and Good Governance",
    username: "ethics_values_and_good_governance",
  },
];

export const BCS_SUBJECT_VALUES: Subject[] = BCS_SUBJECTS.map((subject) => subject.value);
