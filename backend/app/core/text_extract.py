import io

from pypdf import PdfReader
from docx import Document


def extract_text(file_name: str, data: bytes) -> str:
    name = file_name.lower()
    file = []

    if(name.endswith(".pdf")):
        reader = PdfReader(io.BytesIO(data))
        for page in reader.pages:
            file.append(page.extract_text())

        return "\n".join(file)

    elif(name.endswith(".docx")):
        doc = Document(io.BytesIO(data))
        for paragraph in doc.paragraphs:
            file.append(paragraph.text)
        return "\n".join(file)
    
    else:
        raise ValueError("רק קבצים מסוג Word ו- PDF נתמכים!")
