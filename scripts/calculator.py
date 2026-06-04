# calculator.py

import math
import sys

# 支持的基本运算和数学函数
OPERATORS = {
    '+': lambda a, b: a + b,
    '-': lambda a, b: a - b,
    '*': lambda a, b: a * b,
    '/': lambda a, b: a / b if b != 0 else float('inf'),
    '//': lambda a, b: a // b if b != 0 else float('inf'),
    '%': lambda a, b: a % b if b != 0 else float('nan'),
    '**': lambda a, b: a ** b,
}

FUNCTIONS = {
    'sin': math.sin,
    'cos': math.cos,
    'tan': math.tan,
    'sqrt': math.sqrt,
    'log': math.log,
    'log10': math.log10,
    'exp': math.exp,
    'abs': abs,
    'round': round,
    'floor': math.floor,
    'ceil': math.ceil,
}

# 解析并计算表达式（支持括号、运算符优先级）
def parse_expression(expr):
    """安全地计算数学表达式"""
    # 全局允许的命名
    allowed_names = {**FUNCTIONS, **math.__dict__}
    allowed_names['pi'] = math.pi
    allowed_names['e'] = math.e
    
    try:
        # 限制 builtins，避免危险调用
        result = eval(expr, {"__builtins__": None}, allowed_names)
        return result
    except ZeroDivisionError:
        return "错误: 除以零"
    except Exception as e:
        return f"错误: {e}"

def main():
    print("===== Python 计算器 =====")
    print("支持运算: + - * / // % **")
    print("支持函数: sin, cos, tan, sqrt, log, log10, exp, abs, round, floor, ceil")
    print("常数: pi, e")
    print("输入 'exit' 退出\n")
    
    while True:
        expr = input(">>> ").strip()
        if expr.lower() in ('exit', 'quit', 'q'):
            print("再见！")
            break
        if not expr:
            continue
        
        # 替换 ^ 为 ** (可选)
        expr = expr.replace('^', '**')
        
        result = parse_expression(expr)
        print(f"= {result}\n")

if __name__ == "__main__":
    main()