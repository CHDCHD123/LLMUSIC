from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
import pendulum
import os

# 스크립트 파일에서 정의된 함수 임포트
from crawler_genie import run_crawler
from diff_genie import run_diff_analysis
from jsontxt_genie import run_report_generation

local_tz = pendulum.timezone("Asia/Seoul")

# Airflow DAG 정의
with DAG(
    dag_id='genie_chart_pipeline',
    start_date=local_tz.datetime(2023, 1, 1),
    schedule_interval='0 17 * * *',
    catchup=False,
    tags=['genie', 'chart', 'etl'],
    params={
        "data_folder": "/opt/airflow/data" # 컨테이너 내부의 데이터 저장 및 읽기 경로
    },
) as dag:
    
    # 크롤링 태스크
    crawl_task = PythonOperator(
        task_id='crawl_genie_chart',
        python_callable=run_crawler,
        op_kwargs={'output_folder': dag.params['data_folder']}
    )

    # 차이 분석 태스크
    diff_task = PythonOperator(
        task_id='analyze_chart_diff',
        python_callable=run_diff_analysis,
        op_kwargs={
            'input_folder': dag.params['data_folder'],
            'output_folder': dag.params['data_folder']
        }
    )

    # 보고서 생성 태스크
    report_task = PythonOperator(
        task_id='generate_llm_report',
        python_callable=run_report_generation,
        op_kwargs={
            'input_folder': dag.params['data_folder'],
            'output_folder': dag.params['data_folder']
        }
    )

    # 태스크 의존성 설정
    crawl_task >> diff_task >> report_task
