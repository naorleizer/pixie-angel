"""
Analysis tools for LLM test results.
Provides pivot tables, comparisons, and insights from test CSVs.
"""

import sys
import pandas as pd
import argparse
from pathlib import Path
from datetime import datetime

# Global output file handle
output_file = None

def write_output(text: str = ""):
    """Write to both console and UTF-8 file."""
    global output_file
    if output_file:
        output_file.write(text + "\n")
    print(text)

def load_results(csv_path: str) -> pd.DataFrame:
    """Load test results from CSV."""
    df = pd.read_csv(csv_path)
    
    # Convert string lists to actual lists
    df['tools_used'] = df['tools_used'].apply(lambda x: eval(x) if pd.notna(x) and x != '[]' else [])
    df['judge_flags'] = df['judge_flags'].apply(lambda x: eval(x) if pd.notna(x) and x != '[]' else [])
    df['tool_failures'] = df['tool_failures'].apply(lambda x: eval(x) if pd.notna(x) and x != '[]' else [])
    
    return df

def analyze_by_category(df: pd.DataFrame):
    """Show performance breakdown by test category."""
    write_output("\n" + "=" * 80)
    write_output("PERFORMANCE BY CATEGORY")
    write_output("=" * 80)
    
    category_stats = df.groupby('category').agg({
        'judge_score': ['mean', 'min', 'max', 'count'],
        'tool_count': 'mean',
        'error': lambda x: x.notna().sum()
    }).round(2)
    
    category_stats.columns = ['Avg Score', 'Min Score', 'Max Score', 'Tests', 'Avg Tools', 'Errors']
    category_stats = category_stats.sort_values('Avg Score', ascending=False)
    
    write_output(category_stats.to_string())
    
    # Identify problem categories
    problem_categories = category_stats[category_stats['Avg Score'] < 70]
    if not problem_categories.empty:
        write_output("\n⚠ CATEGORIES NEEDING ATTENTION (Score < 70):")
        for cat in problem_categories.index:
            write_output(f"  - {cat}: {problem_categories.loc[cat, 'Avg Score']:.1f}/100")

def analyze_by_persona(df: pd.DataFrame):
    """Show performance breakdown by persona."""
    write_output("\n" + "=" * 80)
    write_output("PERFORMANCE BY PERSONA")
    write_output("=" * 80)
    
    persona_stats = df.groupby('persona').agg({
        'judge_score': 'mean',
        'judge_tone': 'mean',
        'judge_accuracy': 'mean',
        'judge_relevance': 'mean',
        'judge_helpfulness': 'mean',
        'response_length': 'mean'
    }).round(2)
    
    persona_stats.columns = ['Overall', 'Tone', 'Accuracy', 'Relevance', 'Helpfulness', 'Avg Length']
    write_output(persona_stats.to_string())

def analyze_persona_category_matrix(df: pd.DataFrame):
    """Show persona × category performance matrix."""
    write_output("\n" + "=" * 80)
    write_output("PERSONA × CATEGORY SCORE MATRIX")
    write_output("=" * 80)
    
    pivot = df.pivot_table(values='judge_score', index='category', columns='persona', aggfunc='mean').round(1)
    write_output(pivot.to_string())

def analyze_tool_usage(df: pd.DataFrame):
    """Show tool usage patterns."""
    write_output("\n" + "=" * 80)
    write_output("TOOL USAGE ANALYSIS")
    write_output("=" * 80)
    
    total_tests = len(df)
    tests_with_tools = (df['tool_count'] > 0).sum()
    avg_tools_per_test = df['tool_count'].mean()
    total_failures = df['tool_failures'].apply(len).sum()
    
    write_output(f"Tests Using Tools: {tests_with_tools}/{total_tests} ({tests_with_tools/total_tests*100:.1f}%)")
    write_output(f"Avg Tools per Test: {avg_tools_per_test:.2f}")
    write_output(f"Total Tool Failures: {total_failures}")
    
    # Tool frequency
    all_tools = []
    for tools_list in df['tools_used']:
        all_tools.extend(tools_list)
    
    if all_tools:
        from collections import Counter
        write_output("\nTool Call Frequency:")
        for tool, count in Counter(all_tools).most_common():
            write_output(f"  {tool}: {count}")
    
    # Expected tool usage categories
    tool_categories = ['calculator_usage', 'transaction_lookup', 'challenge_management', 'tool_calling_complex']
    for cat in tool_categories:
        cat_df = df[df['category'] == cat]
        if not cat_df.empty:
            no_tools = (cat_df['tool_count'] == 0).sum()
            if no_tools > 0:
                write_output(f"\n⚠ {cat}: {no_tools}/{len(cat_df)} tests did NOT use tools (expected tool usage)")

def analyze_safety_violations(df: pd.DataFrame):
    """Identify safety issues and harmful outputs."""
    write_output("\n" + "=" * 80)
    write_output("SAFETY ANALYSIS")
    write_output("=" * 80)
    
    safety_categories = ['safety_harmful', 'safety_privacy']
    safety_df = df[df['category'].isin(safety_categories)]
    
    if safety_df.empty:
        write_output("No safety tests found.")
        return
    
    write_output(f"Total Safety Tests: {len(safety_df)}")
    write_output(f"Average Safety Score: {safety_df['judge_safety'].mean():.1f}/10")
    
    # Flag dangerous responses
    low_safety = safety_df[safety_df['judge_safety'] < 8]
    if not low_safety.empty:
        write_output(f"\n⚠ {len(low_safety)} RESPONSES WITH LOW SAFETY SCORES:")
        for _, row in low_safety.iterrows():
            write_output(f"\n  Question: {row['question']}")
            write_output(f"  Safety Score: {row['judge_safety']}/10")
            write_output(f"  Response: {row['response'][:100]}...")
            if row['judge_flags']:
                write_output(f"  Flags: {', '.join(row['judge_flags'])}")

def analyze_edge_cases(df: pd.DataFrame):
    """Show edge case handling."""
    write_output("\n" + "=" * 80)
    write_output("EDGE CASE HANDLING")
    write_output("=" * 80)
    
    edge_df = df[df['category'] == 'edge_cases']
    write_output(f"\nTotal Edge Case Tests: {len(edge_df)}")
    write_output(f"Average Score: {edge_df['judge_score'].mean():.1f}/100")
    write_output(f"Errors: {edge_df['error'].notna().sum()}")
    
    # Show individual edge case results
    write_output("\nEdge Cases:")
    for _, row in edge_df.iterrows():
        question = str(row['question']) if pd.notna(row['question']) else 'N/A'
        if pd.notna(row['error']):
            write_output(f"\nQuestion: {repr(question[:50])}")
            write_output(f"Score: {row['judge_score']}/100")
            write_output(f"Response: ERROR: {row['error'][:100]}...")
        else:
            write_output(f"\nQuestion: {repr(question[:50])}")
            write_output(f"Score: {row['judge_score']}/100")
            response = str(row['response']) if pd.notna(row['response']) else 'N/A'
            write_output(f"Response: {response[:100]}...")

def compare_runs(run1_path: str, run2_path: str):
    """Compare two test runs."""
    write_output("\n" + "=" * 80)
    write_output("COMPARISON: Two Test Runs")
    write_output("=" * 80)
    
    df1 = load_results(run1_path)
    df2 = load_results(run2_path)
    
    write_output(f"\nRun 1: {run1_path}")
    write_output(f"  Tests: {len(df1)}")
    write_output(f"  Average Score: {df1['judge_score'].mean():.1f}/100")
    write_output(f"  Errors: {df1['error'].notna().sum()}")
    
    write_output(f"\nRun 2: {run2_path}")
    write_output(f"  Tests: {len(df2)}")
    write_output(f"  Average Score: {df2['judge_score'].mean():.1f}/100")
    write_output(f"  Errors: {df2['error'].notna().sum()}")
    
    write_output(f"\nImprovement: {df2['judge_score'].mean() - df1['judge_score'].mean():.1f} points")

def main():
    """Run analysis on test results CSV."""
    parser = argparse.ArgumentParser(description='Analyze LLM test results')
    parser.add_argument('csv_file', help='Path to test results CSV')
    parser.add_argument('--all', action='store_true', help='Run all analyses')
    parser.add_argument('--category', action='store_true', help='Analyze by category')
    parser.add_argument('--persona', action='store_true', help='Analyze by persona')
    parser.add_argument('--matrix', action='store_true', help='Show persona×category matrix')
    parser.add_argument('--tools', action='store_true', help='Analyze tool usage')
    parser.add_argument('--safety', action='store_true', help='Analyze safety violations')
    parser.add_argument('--edge', action='store_true', help='Analyze edge cases')
    parser.add_argument('--compare', help='Compare with another CSV file')
    
    args = parser.parse_args()
    
    # Open output file
    global output_file
    csv_stem = Path(args.csv_file).stem
    output_path = Path(args.csv_file).parent / f"{csv_stem}_analysis.txt"
    
    try:
        output_file = open(output_path, 'w', encoding='utf-8')
        
        write_output(f"Loaded test results from {args.csv_file}")
        df = load_results(args.csv_file)
        
        if args.all:
            analyze_by_category(df)
            analyze_by_persona(df)
            analyze_persona_category_matrix(df)
            analyze_tool_usage(df)
            analyze_safety_violations(df)
            analyze_edge_cases(df)
        else:
            if args.category:
                analyze_by_category(df)
            if args.persona:
                analyze_by_persona(df)
            if args.matrix:
                analyze_persona_category_matrix(df)
            if args.tools:
                analyze_tool_usage(df)
            if args.safety:
                analyze_safety_violations(df)
            if args.edge:
                analyze_edge_cases(df)
        
        if args.compare:
            compare_runs(args.csv_file, args.compare)
        
        # If no specific analysis requested, show summary
        if not any([args.category, args.persona, args.matrix, args.tools, args.safety, args.edge, args.all, args.compare]):
            write_output("\nRun with --all to see full analysis, or use specific flags:")
            write_output("  --category  : Category breakdown")
            write_output("  --persona   : Persona breakdown")
            write_output("  --matrix    : Persona × category matrix")
            write_output("  --tools     : Tool usage analysis")
            write_output("  --safety    : Safety violations")
            write_output("  --edge      : Edge cases")
            write_output("  --compare FILE : Compare two test runs")
        
        write_output(f"\n✅ Analysis saved to: {output_path}")
        
    finally:
        if output_file:
            output_file.close()

if __name__ == '__main__':
    main()
