import pandas as pd
from datetime import datetime

input_file = 'dataset.csv'
output_file = 'output_data.csv'

try:
    df = pd.read_csv(input_file, delimiter=',')
except FileNotFoundError:
    print(f"Error: {input_file} not found.")
    exit()

required_columns = ['WHOIS_REGDATE', 'WHOIS_UPDATED_DATE']
if not all(column in df.columns for column in required_columns):
    print("Error: Required columns are missing.")
    exit()

df['DATE_DIFF'] = -1

for index, row in df.iterrows():
    regdate_str = row['WHOIS_REGDATE']
    updated_date_str = row['WHOIS_UPDATED_DATE']

    if pd.isnull(regdate_str) or pd.isnull(updated_date_str):
        continue
    
    if str(regdate_str).lower() == 'unknown' or str(updated_date_str).lower() == 'unknown':
        continue

    regdate_s = str(regdate_str).strip()
    updated_date_s = str(updated_date_str).strip()

    regdate = None
    updated_date = None

    formats = [
        '%Y-%m-%dT%H:%M:%S.%fZ',
        '%d/%m/%Y %H:%M',
        '%m/%d/%Y %H:%M',
        '%Y-%m-%d %H:%M:%S'
    ]

    def parse_date(date_str):
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        return None

    regdate = parse_date(regdate_s)
    updated_date = parse_date(updated_date_s)

    if regdate and updated_date:
        date_diff = (updated_date - regdate).days
        df.at[index, 'DATE_DIFF'] = date_diff

df.to_csv(output_file, index=False, sep=',')
print(f"Successfully created {output_file} with DATE_DIFF column.")
