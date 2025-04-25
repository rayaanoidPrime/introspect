from datetime import datetime
import enum
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Index,
    Integer,
    JSON,
    MetaData,
    Text,
    Enum,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, mapped_column
from pgvector.sqlalchemy import Vector
from datetime import datetime

base_metadata = MetaData()
Base = declarative_base(metadata=base_metadata)

################################################################################
# This file should only contain the database models.
# All other files should import this file and use the models where required.
# This file should not import stateful objects like engines, sessions, etc. to
# avoid circular imports.
#
# We order the models based on the timing of their creation / usage in the
# product:
# 1. Users
# 2. Credentials for connecting to databases
# 3. Metadata of the user's database tables
# 4. Additional context (glossary, golden queries, etc.)
# 5. Analyses and tool runs from the agents ui
# 6. Oracle related tables
################################################################################


# USERS AND AUTHENTICATION
class UserStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"

class UserType(enum.Enum):
    ADMIN = "ADMIN"
    GENERAL = "GENERAL"

class Users(Base):
    """
    Represents the Users table.
    username is generally the email address of the user.
    hashed_password is hash(username, salt, password)
    token is what we use to authenticate the user for all user-related requests.
    created_at is the timestamp when the user was created.
    user_type defines the user's role in the system (ADMIN or GENERAL).
    status indicates if the account is ACTIVE or INACTIVE.
    last_login tracks the timestamp of the user's most recent login.
    """

    __tablename__ = "users"
    username = Column(Text, primary_key=True)
    hashed_password = Column(Text)
    token = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    user_type = Column(Enum(UserType), default=UserType.ADMIN)
    status = Column(Enum(UserStatus), default=UserStatus.ACTIVE)
    last_login = Column(DateTime)


# PROJECT DETAILS
class Project(Base):
    """
    Table to store the database credentials and other project details.
    Each db_name is associated with a single project. Think of "db_name" as an alias for project name
    """
    __tablename__ = "project"
    db_name = Column(Text, primary_key=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    project_description = Column(Text)
    db_type = Column(Text)
    db_creds = Column(JSON)
    associated_files = Column(JSON) # this is a list of file_ids, links to PDFFiles.file_id


class Metadata(Base):
    """
    Table to store the metadata for the user.
    1 user's metadata is associated with 1 db_name.
    Every column in the user's metadata maps to a row in this table.
    """

    __tablename__ = "metadata"
    db_name = Column(Text, primary_key=True)
    table_name = Column(Text, primary_key=True)
    column_name = Column(Text, primary_key=True)
    data_type = Column(Text)
    column_description = Column(Text)

    __table_args__ = (Index("metadata_db_name_idx", "db_name"),)


class TableInfo(Base):
    """
    Stores 1 row per table. Currently only used for table descriptions, but
    could be extended to store other additional metadata in the future like
    sample rows, join hints, embeddings, table-specific sample queries, etc.
    """

    __tablename__ = "table_info"
    db_name = Column(Text, primary_key=True)
    table_name = Column(Text, primary_key=True)
    table_description = Column(Text)

    __table_args__ = (Index("table_info_db_name_idx", "db_name"),)


# This was formerly known as "glossary"
class Instructions(Base):
    __tablename__ = "instructions"
    db_name = Column(Text, primary_key=True)
    sql_instructions = Column(Text)
    join_hints = Column(JSONB)


class GoldenQueries(Base):
    __tablename__ = "golden_queries"
    db_name = Column(Text, primary_key=True)
    question = Column(Text, primary_key=True)
    sql = Column(Text)
    embedding = mapped_column(Vector())


# ANALYSIS DETAILS
class Analyses(Base):
    __tablename__ = "analyses"
    analysis_id = Column(Text, primary_key=True)
    user_question = Column(Text, default=None)
    db_name = Column(Text, nullable=False)
    timestamp = Column(DateTime)
    follow_up_analyses = Column(JSON)
    parent_analyses = Column(JSON)
    is_root_analysis = Column(Boolean, default=True)
    root_analysis_id = Column(Text)
    direct_parent_id = Column(Text)
    data = Column(JSON)


# USER HISTORY (for query data page)
class UserHistory(Base):
    __tablename__ = "user_history"
    username = Column(Text, primary_key=True)
    history = Column(JSON)


# ORACLE TABLES

class OracleGuidelines(Base):
    __tablename__ = "oracle_guidelines"
    db_name = Column(Text, primary_key=True)
    clarification_guidelines = Column(Text)
    generate_questions_guidelines = Column(Text)
    generate_questions_deeper_guidelines = Column(Text)
    generate_report_guidelines = Column(Text)

class ReportStatus(enum.Enum):
    INITIALIZED = "INITIALIZED"
    THINKING = "THINKING"
    ERRORED = "ERRORED"
    DONE = "DONE"

class OracleReports(Base):
    __tablename__ = "oracle_reports"
    report_id = Column(Integer, primary_key=True, autoincrement=True)
    report_name = Column(Text)
    created_ts = Column(DateTime, default=datetime.now)
    status = Column(Enum(ReportStatus), default=ReportStatus.INITIALIZED)
    db_name = Column(Text)
    inputs = Column(JSON)
    mdx = Column(Text)
    report_content_with_citations = Column(JSON, default=None)
    analyses = Column(JSON) # this is a list of analyses. These are SQL only and do not include any non-SQL tools.
    feedback = Column(Text, default=None)
    general_comments = Column(Text, default=None)
    comments = Column(JSON, default=None)
    thinking_steps = Column(JSON, default=None) # this is a list of all tool inputs and outputs, including all non-SQL tools.
    is_public = Column(Boolean, default=False)
    public_uuid = Column(Text, unique=True, index=True)

# CUSTOM TOOLS
class CustomTools(Base):
    """
    Stores custom tools defined by users that can be used alongside default analysis tools.
    Each tool has a unique nam.
    """
    __tablename__ = "custom_tools"
    tool_name = Column(Text, primary_key=True)
    tool_description = Column(Text)
    input_model = Column(Text)  # JSON schema for input validation
    tool_code = Column(Text)    # The actual Python code for the tool
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

# PDF Files
class PDFFiles(Base):
    __tablename__ = "pdf_files"
    file_id = Column(Integer, primary_key=True, autoincrement=True)
    file_name = Column(Text, primary_key=True)
    base64_data = Column(Text)
    created_at = Column(DateTime, default=datetime.now)